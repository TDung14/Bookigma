package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class BookResponseDto {
    private Long id;
    private String title;
    private String author;
    private String category;
    private Long shopId;
    private String shopName;
    private String coverUrl;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer stock;
    private Integer sold;
    private BigDecimal rating;
    private Integer ratingCount;
    private Integer pages;
    private List<String> tags;
    private Boolean blindBook;
    private Boolean forSale;
    /** pending | active | hidden */
    private String status;
    private Integer chapterCount;
    /** Ebook premium: người chưa mở khoá chỉ đọc thử vài chương đầu. */
    private Boolean premium;
    /** Chỉ có ở API chi tiết: người đang xem đọc được toàn bộ cuốn chưa. */
    private Boolean ebookUnlocked;
    private Integer previewChapters;
    private Integer unlockPoints;
    /** Chỉ có ở API chi tiết GET /api/books/{id}. */
    private List<BookChapterDto> chapters;
    private LocalDateTime createdAt;
}
