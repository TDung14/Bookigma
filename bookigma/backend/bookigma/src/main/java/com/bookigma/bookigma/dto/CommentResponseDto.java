package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CommentResponseDto {
    private Long id;
    private Long postId;
    private Long userId;
    private String username;
    private String authorName;
    private String avatarUrl;
    private String content;
    private Long parentCommentId;
    private LocalDateTime createdAt;
}
