package com.bookigma.bookigma.vip.entity;

import com.bookigma.bookigma.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Một đơn nâng cấp VIP chờ chuyển khoản. Chỉ chuyển sang PAID khi ngân hàng
 * báo tiền về (webhook) hoặc quản trị viên đối chiếu sao kê và duyệt tay.
 */
@Entity
@Table(
        name = "vip_purchases",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_vip_purchase_transfer_code", columnNames = "transfer_code"),
                @UniqueConstraint(name = "uk_vip_purchase_provider_tx", columnNames = "provider_transaction_id")
        },
        indexes = {
                @Index(name = "idx_vip_purchase_user", columnList = "user_id"),
                @Index(name = "idx_vip_purchase_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VipPurchase {

    public enum Status {
        PENDING, PAID, CANCELLED, EXPIRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purchase_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "plan_id", nullable = false, length = 20)
    private String planId;

    @Column(name = "plan_name", nullable = false, length = 80)
    private String planName;

    @Column(name = "amount", nullable = false)
    private long amount;

    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "point_bonus_percent", nullable = false)
    private int pointBonusPercent;

    @Column(name = "extra_shelves", nullable = false)
    private int extraShelves;

    @Column(name = "weekly_ebooks", nullable = false)
    private int weeklyEbooks;

    @Column(name = "book_discounts", nullable = false)
    private int bookDiscounts;

    @Column(name = "free_swaps", nullable = false)
    private int freeSwaps;

    @Column(name = "renewal_codes", nullable = false)
    private int renewalCodes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Nội dung chuyển khoản duy nhất, ngân hàng gửi lại trong webhook. */
    @Column(name = "transfer_code", nullable = false, length = 24)
    private String transferCode;

    /** Nguồn xác nhận: SEPAY/CASSO/BANK_WEBHOOK hoặc ADMIN. */
    @Column(name = "provider", length = 40)
    private String provider;

    @Column(name = "provider_transaction_id", length = 120)
    private String providerTransactionId;

    @Column(name = "received_amount")
    private Long receivedAmount;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }
}
