package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class CartItemResponseDto {
    private Long id;
    /** BOOK | BLIND_BOX */
    private String type;
    private Integer quantity;
    /** false nếu sách đã ngừng bán hoặc không đủ hàng — cần xoá khỏi giỏ trước khi thanh toán. */
    private boolean available;
    private String unavailableReason;

    // Dòng sách thường
    private Long bookId;
    private String title;
    private String author;
    private String coverUrl;
    private BigDecimal price;
    private Integer stock;
    private Long shopId;
    private String shopName;

    // Dòng hộp Blind Book (sách bên trong được giấu)
    private BlindBoxResponseDto blindBox;
}
