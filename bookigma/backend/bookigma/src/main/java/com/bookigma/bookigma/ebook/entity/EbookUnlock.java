package com.bookigma.bookigma.ebook.entity;

import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Một người đã mở khoá toàn bộ một ebook premium (bằng điểm hoặc lượt VIP hằng tuần).
 * Mỗi người chỉ mở mỗi cuốn một lần nên có ràng buộc duy nhất (user, book).
 */
@Entity
@Table(name = "ebook_unlocks",
        uniqueConstraints = @UniqueConstraint(name = "uk_ebook_unlock_user_book", columnNames = {"user_id", "book_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EbookUnlock {
    public static final String SOURCE_POINTS = "POINTS";
    public static final String SOURCE_VIP_WEEKLY = "VIP_WEEKLY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unlock_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    /** SOURCE_POINTS hoặc SOURCE_VIP_WEEKLY. */
    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "points_spent", nullable = false)
    private int pointsSpent;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
