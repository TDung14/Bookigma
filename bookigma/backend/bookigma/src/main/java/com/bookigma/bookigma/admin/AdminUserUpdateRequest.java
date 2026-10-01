package com.bookigma.bookigma.admin.dto;

import com.bookigma.bookigma.entity.User;

public record AdminUserUpdateRequest(
        String username,
        String email,
        String password,
        String fullName,
        User.Role role,
        Boolean active
) {}
