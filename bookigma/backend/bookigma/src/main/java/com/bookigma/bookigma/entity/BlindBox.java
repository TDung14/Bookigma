package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Một hộp Blind Book. Cuốn sách bên trong (book) chỉ được lộ cho người mua khi đơn đã giao
 * và họ bấm "Mở hộp" (revealedAt khác null).
 */
@Entity
@Table(name = "blind_boxes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlindBox {
    public enum Status {
        DRAFT, ORDERED, CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "box_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, length = 20)
    private BlindBoxTier tier;

    @Enumerated(EnumType.STRING)
    @Column(name = "mood", nullable = false, length = 20)
    private BlindBoxMood mood;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "revealed_at")
    private LocalDateTime revealedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.DRAFT;
        }
    }

    public boolean isRevealed() {
        return revealedAt != null;
    }
}
