package com.datashare.file;

import com.datashare.common.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Contrôles applicatifs à l'upload (US01) : extensions interdites, tailles, expiration.
 */
@Component
public class UploadPolicy {

    public static final long MAX_SIZE_BYTES = 1_073_741_824L; // 1 GiB
    public static final int MAX_EXPIRATION_DAYS = 7;
    public static final int MIN_EXPIRATION_DAYS = 1;
    public static final int MIN_DOWNLOAD_PASSWORD_LENGTH = 6;

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "com", "cpl", "msi", "ps1", "sh", "vbs", "js", "jar", "scr"
    );

    public void validate(String originalName, long sizeBytes, int expirationDays, String password) {
        if (sizeBytes <= 0) throw new BadRequestException("Empty file");
        if (sizeBytes > MAX_SIZE_BYTES) throw new BadRequestException("File exceeds 1 GB");

        String ext = extension(originalName);
        if (BLOCKED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("File type ." + ext + " is not allowed");
        }

        if (expirationDays < MIN_EXPIRATION_DAYS || expirationDays > MAX_EXPIRATION_DAYS) {
            throw new BadRequestException("Expiration must be between 1 and 7 days");
        }

        if (password != null && !password.isBlank() && password.length() < MIN_DOWNLOAD_PASSWORD_LENGTH) {
            throw new BadRequestException("File password must be at least 6 characters");
        }
    }

    private static String extension(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
    }
}
