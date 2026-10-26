package com.bookigma.bookigma.progress.entity;

import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Tiến độ đọc của một người dùng với một cuốn sách, lưu trên server để dùng được ở mọi thiết bị. */
@Entity
@Table(name = "reading_progress",
        uniqueConstraints = @UniqueConstraint(name = "uk_reading_progress_user_book",
                columnNames = {"user_id", "book_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "progress_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "chapter_index", nullable = false)
    @Builder.Default
    private Integer chapterIndex = 0;

    @Column(name = "paragraph_index", nullable = false)
    @Builder.Default
    private Integer paragraphIndex = 0;

    @Column(name = "percent", nullable = false)
    @Builder.Default
    private Integer percent = 0;

    @Column(name = "seconds_read", nullable = false)
    @Builder.Default
    private Integer secondsRead = 0;

    @Column(name = "finished", nullable = false)
    @Builder.Default
    private Boolean finished = false;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (chapterIndex == null) chapterIndex = 0;
        if (paragraphIndex == null) paragraphIndex = 0;
        if (percent == null) percent = 0;
        if (secondsRead == null) secondsRead = 0;
        if (finished == null) finished = false;
        if (lastReadAt == null) lastReadAt = LocalDateTime.now();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        if (lastReadAt == null) lastReadAt = LocalDateTime.now();
    }
}
