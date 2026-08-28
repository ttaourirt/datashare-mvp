package com.datashare.file.dto;

import com.datashare.file.FileEntity;

import java.time.OffsetDateTime;

public record PublicFileMeta(
        String originalName,
        String mimeType,
        long sizeBytes,
        OffsetDateTime expiresAt,
        boolean passwordProtected
) {
    public static PublicFileMeta from(FileEntity f) {
        return new PublicFileMeta(
                f.getOriginalName(),
                f.getMimeType(),
                f.getSizeBytes(),
                f.getExpiresAt(),
                f.isPasswordProtected()
        );
    }
}
