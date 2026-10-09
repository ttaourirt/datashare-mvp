package com.datashare.file;

import com.datashare.common.BadRequestException;
import com.datashare.common.ForbiddenException;
import com.datashare.common.GoneException;
import com.datashare.common.NotFoundException;
import com.datashare.storage.FileStorageService;
import com.datashare.tag.Tag;
import com.datashare.tag.TagRepository;
import com.datashare.user.User;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);
    private static final int MAX_TAG_LENGTH = 30;

    private final FileRepository fileRepository;
    private final TagRepository tagRepository;
    private final FileStorageService storage;
    private final UploadPolicy uploadPolicy;
    private final PasswordEncoder passwordEncoder;
    private final DistributionSummary uploadSizes;

    public FileService(FileRepository fileRepository,
                       TagRepository tagRepository,
                       FileStorageService storage,
                       UploadPolicy uploadPolicy,
                       PasswordEncoder passwordEncoder,
                       MeterRegistry meterRegistry) {
        this.fileRepository = fileRepository;
        this.tagRepository = tagRepository;
        this.storage = storage;
        this.uploadPolicy = uploadPolicy;
        this.passwordEncoder = passwordEncoder;
        // PERF.md — suivi de la taille des fichiers envoyés
        this.uploadSizes = DistributionSummary.builder("datashare.upload.size")
                .baseUnit("bytes")
                .description("Taille des fichiers envoyés")
                .register(meterRegistry);
    }

    /**
     * US01 (owner != null) et US07 (owner == null).
     * Persiste le fichier sur disque puis crée la ligne DB.
     */
    @Transactional
    public FileEntity upload(User owner,
                             MultipartFile multipart,
                             int expirationDays,
                             String password,
                             List<String> tagNames) throws IOException {
        uploadPolicy.validate(multipart.getOriginalFilename(), multipart.getSize(), expirationDays, password);

        String relativePath;
        try (InputStream in = multipart.getInputStream()) {
            relativePath = storage.store(in, multipart.getOriginalFilename());
        }

        // US07 : un upload anonyme n'a pas de tags
        Set<Tag> resolvedTags = owner != null ? resolveTags(owner, tagNames) : new HashSet<>();

        FileEntity entity = FileEntity.builder()
                .owner(owner)
                .originalName(multipart.getOriginalFilename())
                .storagePath(relativePath)
                .mimeType(multipart.getContentType() != null ? multipart.getContentType() : "application/octet-stream")
                .sizeBytes(multipart.getSize())
                .downloadPasswordHash(password != null && !password.isBlank() ? passwordEncoder.encode(password) : null)
                .expiresAt(OffsetDateTime.now().plusDays(expirationDays))
                .tags(resolvedTags)
                .build();

        FileEntity saved = fileRepository.save(entity);
        uploadSizes.record(multipart.getSize());
        log.info("Upload file id={} size={} bytes anonymous={}", saved.getId(), multipart.getSize(), owner == null);
        return saved;
    }

    /** US05 — historique de l'utilisateur (par défaut : hors expirés). */
    @Transactional(readOnly = true)
    public List<FileEntity> history(User owner, boolean includeExpired) {
        return includeExpired
                ? fileRepository.findAllByOwnerOrderByUploadedAtDesc(owner)
                : fileRepository.findActiveForOwner(owner, OffsetDateTime.now());
    }

    /** US08 — remplace les tags d'un fichier de l'utilisateur. */
    @Transactional
    public FileEntity updateTags(User owner, Long fileId, List<String> tagNames) {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, owner)
                .orElseThrow(() -> new NotFoundException("File " + fileId + " not found"));
        file.getTags().clear();
        file.getTags().addAll(resolveTags(owner, tagNames));
        return fileRepository.save(file);
    }

    /** US06 — suppression irréversible : ligne en BDD (métadonnées + liens tags) puis blob. */
    @Transactional
    public void delete(User owner, Long fileId) throws IOException {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, owner)
                .orElseThrow(() -> new NotFoundException("File " + fileId + " not found"));
        fileRepository.delete(file);
        try {
            storage.delete(file.getStoragePath());
        } catch (IOException ex) {
            log.warn("Failed to delete storage for file {}: {}", fileId, ex.getMessage());
        }
    }

    /** US02 — meta pour lecteur du lien public. */
    @Transactional(readOnly = true)
    public FileEntity findPublicByToken(UUID token) {
        FileEntity file = fileRepository.findByPublicToken(token)
                .orElseThrow(() -> new NotFoundException("Link not found"));
        if (file.isExpired()) throw new GoneException("Link expired");
        return file;
    }

    /** US02 — valide le mdp éventuel. */
    @Transactional(readOnly = true)
    public FileEntity authorizeDownload(UUID token, String password) {
        FileEntity file = findPublicByToken(token);
        if (file.isPasswordProtected()) {
            boolean ok = password != null && passwordEncoder.matches(password, file.getDownloadPasswordHash());
            if (!ok) throw new ForbiddenException("Invalid password");
        }
        return file;
    }

    public InputStream openStream(FileEntity file) throws IOException {
        return storage.open(file.getStoragePath());
    }

    /**
     * US08 — tags en texte libre : doublons ignorés (casse comprise),
     * tags inexistants créés pour l'utilisateur.
     */
    private Set<Tag> resolveTags(User owner, Collection<String> names) {
        Map<String, String> unique = new LinkedHashMap<>();
        if (names != null) {
            for (String raw : names) {
                String name = raw == null ? "" : raw.trim();
                if (name.isEmpty()) continue;
                if (name.length() > MAX_TAG_LENGTH) {
                    throw new BadRequestException("Tag must be at most " + MAX_TAG_LENGTH + " characters");
                }
                unique.putIfAbsent(name.toLowerCase(Locale.ROOT), name);
            }
        }
        Set<Tag> tags = new HashSet<>();
        for (String name : unique.values()) {
            tags.add(tagRepository.findByOwnerAndNameIgnoreCase(owner, name)
                    .orElseGet(() -> tagRepository.save(Tag.builder().owner(owner).name(name).build())));
        }
        return tags;
    }
}
