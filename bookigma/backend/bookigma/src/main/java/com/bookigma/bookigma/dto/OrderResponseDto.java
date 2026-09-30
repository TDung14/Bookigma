package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponseDto {
    private Long id;
    private String code;
    private Long userId;
    private String buyerName;
    private Long shopId;
    private String shopName;
    /** pending | confirmed | shipping | delivered | completed | cancelled */
    private String status;
    /** cod | bank | momo */
    private String paymentMethod;
    private String voucherCode;
    private String note;
    private String recipientName;
    private String recipientPhone;
    private String shippingAddress;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal discount;
    private BigDecimal total;
    private LocalDateTime createdAt;
    private List<OrderItemResponseDto> items;
    private List<OrderTimelineDto> timeline;
}
