package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Formula;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Sách đang bán trên sàn. Sách do shop tạo sẽ ở trạng thái PENDING cho tới khi admin duyệt.
 */
@Entity
@Table(name = "books")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Book {
    public enum Status {
        PENDING, ACTIVE, HIDDEN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "book_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id")
    private Shop shop;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private Author author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "page_count")
    private Integer pageCount;

    @Convert(converter = StringListConverter.class)
    @Column(name = "tags", length = 500)
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Column(name = "is_for_sale", nullable = false)
    @Builder.Default
    private Boolean forSale = true;

    @Column(name = "is_blind_book", nullable = false)
    @Builder.Default
    private Boolean blindBook = false;

    @Column(name = "sale_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "original_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "sold_count", nullable = false)
    @Builder.Default
    private Integer soldCount = 0;

    @Column(name = "rating_avg", nullable = false, precision = 2, scale = 1)
    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private Integer ratingCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Số chương đọc thử, tính trực tiếp từ bảng book_chapters. */
    @Formula("(SELECT COUNT(*) FROM book_chapters c WHERE c.book_id = book_id)")
    private Integer chapterCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
        validatePrices();
    }

    @PreUpdate
    protected void onUpdate() {
        validatePrices();
        updatedAt = LocalDateTime.now();
    }

    /**
     * Quy tắc nghiệp vụ: giá bán phải lớn hơn hoặc bằng giá gốc.
     * Đây là lớp bảo vệ thứ hai sau validation ở service/database.
     */
    private void validatePrices() {
        if (salePrice == null || originalPrice == null) {
            throw new IllegalArgumentException("Giá bán và giá gốc không được để trống.");
        }
        if (salePrice.compareTo(originalPrice) < 0) {
            throw new IllegalArgumentException("Giá bán phải lớn hơn hoặc bằng giá gốc.");
        }
    }

    /** Sách đang hiển thị trên cửa hàng và còn có thể đặt mua. */
    public boolean isPurchasable() {
        return status == Status.ACTIVE && Boolean.TRUE.equals(forSale);
    }
}
