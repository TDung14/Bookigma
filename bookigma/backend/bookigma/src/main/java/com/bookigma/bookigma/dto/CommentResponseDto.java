package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

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
    private long reactionCount;
    private Map<String, Long> reactionCounts;
    private String myReaction;
}
