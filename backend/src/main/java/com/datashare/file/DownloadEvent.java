package com.datashare.file;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "download_events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class DownloadEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "file_id", nullable = false)
    private FileEntity file;

    @Column(nullable = false, length = 45)
    private String ip;

    @Column(name = "downloaded_at", nullable = false, updatable = false)
    private OffsetDateTime downloadedAt;

    @Column(name = "password_ok", nullable = false)
    private boolean passwordOk;

    @PrePersist
    void onCreate() {
        if (downloadedAt == null) downloadedAt = OffsetDateTime.now();
    }
}
