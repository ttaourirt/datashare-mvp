package com.datashare.tag.dto;

import com.datashare.tag.Tag;

public record TagResponse(Long id, String name) {
    public static TagResponse from(Tag t) {
        return new TagResponse(t.getId(), t.getName());
    }
}
