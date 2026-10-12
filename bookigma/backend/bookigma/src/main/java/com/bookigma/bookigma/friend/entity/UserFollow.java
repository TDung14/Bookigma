package com.bookigma.bookigma.friend.entity;

import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_follows", uniqueConstraints = @UniqueConstraint(name = "uk_user_follow_pair", columnNames = {"follower_id", "followed_id"}), indexes = {
        @Index(name = "idx_user_follows_follower", columnList = "follower_id"),
        @Index(name = "idx_user_follows_followed", columnList = "followed_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserFollow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "follower_id", nullable = false)
    private User follower;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "followed_id", nullable = false)
    private User followed;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
