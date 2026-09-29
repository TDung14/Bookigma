package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PostResponseDto {
    private Long id;
    private Long userId;
    private String username;
    private String authorName;
    private String avatarUrl;
    private Long bookId;
    private Long pageId;
    private Long clubId;
    private String content;
    private String imageUrl;
    private String visibility;
    private LocalDateTime createdAt;
}
