package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    /** Khác null nếu dòng này là một hộp Blind Book (book là cuốn được giấu bên trong). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blind_box_id")
    private BlindBox blindBox;

    // Tên và bìa sách tại thời điểm mua, để lịch sử đơn không đổi khi shop sửa sản phẩm.
    @Column(name = "book_title", nullable = false, length = 255)
    private String bookTitle;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
