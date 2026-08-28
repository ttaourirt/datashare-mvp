package com.datashare.file;

import com.datashare.tag.Tag;
import com.datashare.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "files")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class FileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_token", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID publicToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner; // NULL si upload anonyme (US07)

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "download_password_hash")
    private String downloadPasswordHash;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private OffsetDateTime uploadedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(nullable = false)
    private boolean deleted;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "file_tags",
            joinColumns = @JoinColumn(name = "file_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @PrePersist
    void onCreate() {
        if (uploadedAt == null) uploadedAt = OffsetDateTime.now();
        if (publicToken == null) publicToken = UUID.randomUUID();
    }

    public boolean isExpired() {
        return OffsetDateTime.now().isAfter(expiresAt);
    }

    public boolean isPasswordProtected() {
        return downloadPasswordHash != null && !downloadPasswordHash.isBlank();
    }
}
