package com.bookigma.bookigma.progress.entity;

import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Một chương đã đọc xong — dùng để chỉ thưởng điểm cho lần hoàn thành đầu tiên. */
@Entity
@Table(name = "completed_chapters",
        uniqueConstraints = @UniqueConstraint(name = "uk_completed_chapter_user_book_chapter",
                columnNames = {"user_id", "book_id", "chapter_index"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompletedChapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "completed_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "chapter_index", nullable = false)
    private Integer chapterIndex;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (completedAt == null) completedAt = LocalDateTime.now();
    }
}
