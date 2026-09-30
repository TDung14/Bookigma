package com.bookigma.bookigma.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Chương sách để đọc online. Nội dung lưu trong content_text, các đoạn văn cách nhau bởi một dòng trống.
 */
@Entity
@Table(name = "book_chapters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookChapter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chapter_id")
    private Long id;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "chapter_index", nullable = false)
    private Integer chapterIndex;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content_text", columnDefinition = "LONGTEXT")
    private String contentText;
}
