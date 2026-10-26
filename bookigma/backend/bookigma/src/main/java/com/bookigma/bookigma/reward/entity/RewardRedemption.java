package com.bookigma.bookigma.reward.entity;

import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Một lần đổi điểm lấy quà. Voucher (nếu có) được liên kết qua mã. */
@Entity
@Table(name = "reward_redemptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardRedemption {

    public enum Type {
        VOUCHER, PHYSICAL
    }

    public enum Status {
        /** Quà thật đang chờ shop gửi kèm đơn hàng. */
        PENDING,
        /** Voucher đã phát hành và đang nằm trong ví của người dùng. */
        ISSUED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "redemption_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reward_id", nullable = false, length = 50)
    private String rewardId;

    @Column(name = "reward_name", nullable = false, length = 150)
    private String rewardName;

    @Column(name = "cost", nullable = false)
    private Integer cost;

    @Enumerated(EnumType.STRING)
    @Column(name = "reward_type", nullable = false, length = 20)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @Column(name = "voucher_code", length = 30)
    private String voucherCode;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = Status.PENDING;
    }
}
