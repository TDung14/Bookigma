package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OrderItemResponseDto {
    private Long id;
    /** null với người mua khi dòng này là hộp Blind Book chưa mở. */
    private Long bookId;
    private String title;
    private String author;
    private String coverUrl;
    private BigDecimal price;
    private Integer quantity;
    /** Khác null nếu dòng này là một hộp Blind Book. */
    private BlindBoxResponseDto blindBox;
    private boolean revealed;
}
