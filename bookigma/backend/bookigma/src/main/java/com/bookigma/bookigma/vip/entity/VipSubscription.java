package com.bookigma.bookigma.vip.entity;

import com.bookigma.bookigma.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Trạng thái VIP hiện tại của một tài khoản, do backend quản lý. */
@Entity
@Table(
        name = "vip_subscriptions",
        uniqueConstraints = @UniqueConstraint(name = "uk_vip_subscription_user", columnNames = "user_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VipSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "plan_id", length = 20)
    private String planId;

    @Column(name = "plan_name", length = 80)
    private String planName;

    @Column(name = "price", nullable = false)
    @Builder.Default
    private long price = 0;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "extra_shelves", nullable = false)
    @Builder.Default
    private int extraShelves = 0;

    @Column(name = "point_bonus_percent", nullable = false)
    @Builder.Default
    private int pointBonusPercent = 0;

    @Column(name = "weekly_ebooks", nullable = false)
    @Builder.Default
    private int weeklyEbooks = 0;

    @Column(name = "book_discounts", nullable = false)
    @Builder.Default
    private int bookDiscounts = 0;

    @Column(name = "free_swaps", nullable = false)
    @Builder.Default
    private int freeSwaps = 0;

    @Column(name = "renewal_codes", nullable = false)
    @Builder.Default
    private int renewalCodes = 0;

    @Column(name = "music_unlocked", nullable = false)
    @Builder.Default
    private boolean musicUnlocked = false;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private long version = 0;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
