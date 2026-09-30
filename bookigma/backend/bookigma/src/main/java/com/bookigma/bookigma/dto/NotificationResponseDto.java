package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponseDto {
    private Long id;
    private Long userId;
    private String message;
    private String link;
    private boolean read;
    private LocalDateTime createdAt;
}
