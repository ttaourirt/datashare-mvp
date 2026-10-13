package com.datashare.file.dto;

import com.datashare.file.FileEntity;
import com.datashare.tag.dto.TagResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record FileResponse(
        Long id,
        UUID publicToken,
        String originalName,
        String mimeType,
        long sizeBytes,
        OffsetDateTime uploadedAt,
        OffsetDateTime expiresAt,
        boolean passwordProtected,
        boolean expired,
        String downloadUrl,
        List<TagResponse> tags
) {
    public static FileResponse from(FileEntity f) {
        return new FileResponse(
                f.getId(),
                f.getPublicToken(),
                f.getOriginalName(),
                f.getMimeType(),
                f.getSizeBytes(),
                f.getUploadedAt(),
                f.getExpiresAt(),
                f.isPasswordProtected(),
                f.isExpired(),
                "/d/" + f.getPublicToken(),
                f.getTags().stream().map(TagResponse::from).toList()
        );
    }
}
