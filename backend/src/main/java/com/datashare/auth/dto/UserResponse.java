package com.datashare.auth.dto;

import com.datashare.user.User;

import java.time.OffsetDateTime;

public record UserResponse(Long id, String email, String name, OffsetDateTime createdAt) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getName(), u.getCreatedAt());
    }
}
