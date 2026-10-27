package com.bookigma.bookigma.reward.entity;

import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.Voucher;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Voucher cá nhân phát ra khi đổi điểm. Khác với bảng vouchers (mã công khai cho mọi người),
 * mỗi dòng ở đây thuộc về đúng một tài khoản và chỉ dùng được một lần.
 */
@Entity
@Table(name = "user_vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_voucher_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "label", nullable = false, length = 150)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    private Voucher.DiscountType discountType;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount", precision = 10, scale = 2)
    private BigDecimal maxDiscount;

    @Column(name = "min_order_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "used", nullable = false)
    @Builder.Default
    private Boolean used = false;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Nguồn phát (SOURCE_*). Null = voucher đổi điểm tạo trước khi có cột này. */
    @Column(name = "source", length = 20)
    private String source;

    public static final String SOURCE_REWARD = "REWARD";
    public static final String SOURCE_VIP_PERK = "VIP_PERK";
    public static final String SOURCE_VIP_DAILY = "VIP_DAILY";
    public static final String SOURCE_VIP_RENEWAL = "VIP_RENEWAL";

    /** Mã gia hạn chỉ giảm giá khi mua VIP, không dùng cho đơn sách. */
    public boolean isVipRenewal() {
        return SOURCE_VIP_RENEWAL.equals(source);
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (used == null) used = false;
        if (minOrderAmount == null) minOrderAmount = BigDecimal.ZERO;
    }
}
