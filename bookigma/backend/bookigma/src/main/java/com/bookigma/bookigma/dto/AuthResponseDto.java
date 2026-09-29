package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuthResponseDto {

    private Long id;

    private String username;

    private String email;

    private String fullName;

    private String bio;

    private String avatarUrl;

    private String role;

    private String status;

    private Integer points;

    private String badge;

    private Integer booksRead;

    private LocalDateTime createdAt;
}