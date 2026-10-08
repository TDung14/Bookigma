package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.BookChapter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookChapterRepository extends JpaRepository<BookChapter, Long> {
    List<BookChapter> findByBookIdOrderByChapterIndexAsc(Long bookId);
    long countByBookId(Long bookId);
}
