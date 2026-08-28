package com.datashare.file;

import com.datashare.common.ForbiddenException;
import com.datashare.common.GoneException;
import com.datashare.common.NotFoundException;
import com.datashare.storage.FileStorageService;
import com.datashare.tag.Tag;
import com.datashare.tag.TagRepository;
import com.datashare.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    private final FileRepository fileRepository;
    private final DownloadEventRepository downloadEventRepository;
    private final TagRepository tagRepository;
    private final FileStorageService storage;
    private final UploadPolicy uploadPolicy;
    private final PasswordEncoder passwordEncoder;

    public FileService(FileRepository fileRepository,
                       DownloadEventRepository downloadEventRepository,
                       TagRepository tagRepository,
                       FileStorageService storage,
                       UploadPolicy uploadPolicy,
                       PasswordEncoder passwordEncoder) {
        this.fileRepository = fileRepository;
        this.downloadEventRepository = downloadEventRepository;
        this.tagRepository = tagRepository;
        this.storage = storage;
        this.uploadPolicy = uploadPolicy;
        this.passwordEncoder = passwordEncoder;
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
                             Set<Long> tagIds) throws IOException {
        uploadPolicy.validate(multipart.getOriginalFilename(), multipart.getSize(), expirationDays, password);

        String relativePath;
        try (InputStream in = multipart.getInputStream()) {
            relativePath = storage.store(in, multipart.getOriginalFilename());
        }

        Set<Tag> resolvedTags = new HashSet<>();
        if (owner != null && tagIds != null && !tagIds.isEmpty()) {
            resolvedTags = tagRepository.findAllByIdInAndOwner(tagIds, owner);
            if (resolvedTags.size() != tagIds.size()) {
                throw new NotFoundException("One or more tags not found for this user");
            }
        }

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

        return fileRepository.save(entity);
    }

    /** US05 — historique de l'utilisateur (par défaut : hors expirés). */
    @Transactional(readOnly = true)
    public List<FileEntity> history(User owner, boolean includeExpired) {
        return includeExpired
                ? fileRepository.findAllByOwnerAndDeletedFalseOrderByUploadedAtDesc(owner)
                : fileRepository.findActiveForOwner(owner, OffsetDateTime.now());
    }

    /** US06 — supprime le fichier (soft-delete DB + delete filesystem). */
    @Transactional
    public void delete(User owner, Long fileId) throws IOException {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, owner)
                .orElseThrow(() -> new NotFoundException("File " + fileId + " not found"));
        file.setDeleted(true);
        fileRepository.save(file);
        try {
            storage.delete(file.getStoragePath());
        } catch (IOException ex) {
            log.warn("Failed to delete storage for file {}: {}", fileId, ex.getMessage());
        }
    }

    /** US02 — meta pour lecteur du lien public. */
    @Transactional(readOnly = true)
    public FileEntity findPublicByToken(UUID token) {
        FileEntity file = fileRepository.findByPublicTokenAndDeletedFalse(token)
                .orElseThrow(() -> new NotFoundException("Link not found"));
        if (file.isExpired()) throw new GoneException("Link expired");
        return file;
    }

    /** US02 — valide le mdp éventuel et enregistre l'événement. */
    @Transactional
    public FileEntity authorizeDownload(UUID token, String password, String ip) {
        FileEntity file = findPublicByToken(token);
        boolean ok;
        if (file.isPasswordProtected()) {
            ok = password != null && passwordEncoder.matches(password, file.getDownloadPasswordHash());
        } else {
            ok = true;
        }
        downloadEventRepository.save(DownloadEvent.builder().file(file).ip(ip).passwordOk(ok).build());
        if (!ok) throw new ForbiddenException("Invalid password");
        return file;
    }

    public InputStream openStream(FileEntity file) throws IOException {
        return storage.open(file.getStoragePath());
    }
}
