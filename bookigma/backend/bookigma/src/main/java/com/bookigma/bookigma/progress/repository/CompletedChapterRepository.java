package com.bookigma.bookigma.progress.repository;

import com.bookigma.bookigma.progress.entity.CompletedChapter;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompletedChapterRepository extends JpaRepository<CompletedChapter, Long> {
    boolean existsByUser_IdAndBook_IdAndChapterIndex(Long userId, Long bookId, Integer chapterIndex);
}
