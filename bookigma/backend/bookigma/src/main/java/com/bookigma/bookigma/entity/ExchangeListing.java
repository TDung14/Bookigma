package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Tin đăng trên sàn trao đổi sách cũ: "tôi có cuốn X (tình trạng, khu vực), muốn đổi lấy Y".
 */
@Entity
@Table(name = "exchange_listings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeListing {
    public enum Status {
        OPEN,    // đang nhận đề nghị
        TRADED,  // chủ tin đã chấp nhận một đề nghị
        CLOSED   // chủ tin tự đóng
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "listing_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "book_title", nullable = false, length = 255)
    private String bookTitle;

    @Column(name = "wanted", nullable = false, length = 255)
    private String wanted;

    @Column(name = "book_condition", nullable = false, length = 30)
    private String condition;

    @Column(name = "location", nullable = false, length = 100)
    private String location;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "listing", cascade = CascadeType.REMOVE)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<ExchangeOffer> offers = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.OPEN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
