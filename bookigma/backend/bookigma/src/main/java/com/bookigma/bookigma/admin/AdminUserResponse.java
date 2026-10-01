package com.bookigma.bookigma.admin.dto;

import com.bookigma.bookigma.entity.User;

import java.time.LocalDateTime;

public record AdminUserResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String avatarUrl,
        User.Role role,
        Boolean active,
        LocalDateTime createdAt
) {}
