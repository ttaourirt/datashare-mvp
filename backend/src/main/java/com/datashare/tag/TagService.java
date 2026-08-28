package com.datashare.tag;

import com.datashare.common.ConflictException;
import com.datashare.common.NotFoundException;
import com.datashare.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    public List<Tag> listForOwner(User owner) {
        return tagRepository.findAllByOwnerOrderByNameAsc(owner);
    }

    @Transactional
    public Tag create(User owner, String name) {
        if (tagRepository.existsByOwnerAndNameIgnoreCase(owner, name)) {
            throw new ConflictException("Tag already exists: " + name);
        }
        return tagRepository.save(Tag.builder().owner(owner).name(name).build());
    }

    @Transactional
    public void delete(User owner, Long tagId) {
        Tag tag = tagRepository.findByIdAndOwner(tagId, owner)
                .orElseThrow(() -> new NotFoundException("Tag " + tagId + " not found"));
        tagRepository.delete(tag);
    }
}
