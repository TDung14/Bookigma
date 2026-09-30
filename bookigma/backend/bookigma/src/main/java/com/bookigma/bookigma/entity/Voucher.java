package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voucher {
    public enum DiscountType {
        PERCENT,   // giảm theo %, có trần maxDiscount
        AMOUNT,    // giảm một số tiền cố định
        SHIPPING   // miễn phí vận chuyển
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "voucher_id")
    private Integer id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "label", nullable = false, length = 150)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount", precision = 10, scale = 2)
    private BigDecimal maxDiscount;

    @Column(name = "min_order_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
