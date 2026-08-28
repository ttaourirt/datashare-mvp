package com.datashare.tag;

import com.datashare.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findAllByOwnerOrderByNameAsc(User owner);
    Optional<Tag> findByIdAndOwner(Long id, User owner);
    boolean existsByOwnerAndNameIgnoreCase(User owner, String name);
    Set<Tag> findAllByIdInAndOwner(Set<Long> ids, User owner);
}
