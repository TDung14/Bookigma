package com.bookigma.bookigma.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    public enum Role {
        USER, SHOP, MODERATOR, SUPPORT, ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    @Column(name = "banner_url", length = 255)
    private String bannerUrl;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "interests", length = 500)
    private String interests;

    @Column(name = "hometown", length = 120)
    private String hometown;

    @Column(name = "current_location", length = 120)
    private String currentLocation;

    @Column(name = "marital_status", length = 30)
    private String maritalStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.USER;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    // Tài khoản tạo trước khi có tính năng xác thực được coi là đã xác thực.
    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean emailVerified = false;

    @JsonIgnore
    @Column(name = "verification_token_hash", length = 64)
    private String verificationTokenHash;

    @Column(name = "verification_expires_at")
    private LocalDateTime verificationExpiresAt;

    @Column(name = "verification_sent_at")
    private LocalDateTime verificationSentAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "streak", nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private Integer streak = 0;

    @Column(name = "last_streak_date")
    private LocalDate lastStreakDate;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (streak == null) {
            streak = 0;
        }
        if (role == null) {
            role = Role.USER;
        }
        if (active == null) {
            active = true;
        }
        if (emailVerified == null) {
            emailVerified = false;
        }
    }
}


