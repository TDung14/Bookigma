package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    private long likeCount;
    private boolean likedByMe;
    private List<Long> likedBy;
    private Map<String, Long> reactionCounts;
    private String myReaction;
    private List<CommentResponseDto> comments;
}
