package com.datashare.tag;

import com.datashare.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findAllByOwnerOrderByNameAsc(User owner);
    Optional<Tag> findByIdAndOwner(Long id, User owner);
    boolean existsByOwnerAndNameIgnoreCase(User owner, String name);
    Optional<Tag> findByOwnerAndNameIgnoreCase(User owner, String name);
}
