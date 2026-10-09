package com.datashare.file;

import com.datashare.user.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FileRepository extends JpaRepository<FileEntity, Long> {

    @EntityGraph(attributePaths = "tags")
    List<FileEntity> findAllByOwnerOrderByUploadedAtDesc(User owner);

    @EntityGraph(attributePaths = "tags")
    @Query("""
           SELECT f FROM FileEntity f
           WHERE f.owner = :owner
             AND f.expiresAt > :now
           ORDER BY f.uploadedAt DESC
           """)
    List<FileEntity> findActiveForOwner(User owner, OffsetDateTime now);

    Optional<FileEntity> findByIdAndOwner(Long id, User owner);

    Optional<FileEntity> findByPublicToken(UUID publicToken);

    List<FileEntity> findAllByExpiresAtBefore(OffsetDateTime cutoff);
}
