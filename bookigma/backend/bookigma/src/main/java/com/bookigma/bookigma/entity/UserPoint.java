package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPoint {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "total_points", nullable = false)
    @Builder.Default
    private Integer totalPoints = 0;

    @Column(name = "monthly_points", nullable = false)
    @Builder.Default
    private Integer monthlyPoints = 0;

    @Column(name = "current_tier", length = 50)
    @Builder.Default
    private String currentTier = "Tập Sự";

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.lastUpdated = LocalDateTime.now();
        if (this.totalPoints == null) this.totalPoints = 0;
        if (this.monthlyPoints == null) this.monthlyPoints = 0;
        if (this.currentTier == null) this.currentTier = calculateTier(this.totalPoints);
    }

    public static String calculateTier(int points) {
        if (points >= 10000) return "Đại Sứ Sách";
        if (points >= 5000) return "Mọt Sách VIP";
        if (points >= 1000) return "Độc Giả Thân Thiết";
        return "Tập Sự";
    }
}
