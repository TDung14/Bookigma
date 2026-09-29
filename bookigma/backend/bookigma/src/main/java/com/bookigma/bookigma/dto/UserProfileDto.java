package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserProfileDto {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String bio;
    private String avatarUrl;
    private String role;
    private Boolean active;
    private LocalDateTime createdAt;
}
