package com.datashare.file;

import com.datashare.storage.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * US10 — purge quotidienne des fichiers expirés.
 * Supprime le blob physique puis marque `deleted=true` en BDD.
 */
@Component
public class FileExpirationJob {

    private static final Logger log = LoggerFactory.getLogger(FileExpirationJob.class);

    private final FileRepository fileRepository;
    private final FileStorageService storage;

    public FileExpirationJob(FileRepository fileRepository, FileStorageService storage) {
        this.fileRepository = fileRepository;
        this.storage = storage;
    }

    // Tous les jours à 3h du matin
    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    @Transactional
    public void purgeExpired() {
        OffsetDateTime now = OffsetDateTime.now();
        List<FileEntity> expired = fileRepository.findAllByDeletedFalseAndExpiresAtBefore(now);
        int purged = 0;
        for (FileEntity file : expired) {
            try {
                storage.delete(file.getStoragePath());
            } catch (IOException ex) {
                log.warn("Failed to delete blob {}: {}", file.getStoragePath(), ex.getMessage());
            }
            file.setDeleted(true);
            purged++;
        }
        fileRepository.saveAll(expired);
        if (purged > 0) log.info("Expired {} files at {}", purged, now);
    }
}
