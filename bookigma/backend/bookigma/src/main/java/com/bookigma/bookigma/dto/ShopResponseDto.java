package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ShopResponseDto {
    private Long id;
    private String name;
    private Long ownerId;
    private String avatarUrl;
    private String description;
    private BigDecimal rating;
    private Integer followers;
    private Boolean verified;
    private LocalDateTime createdAt;
}
