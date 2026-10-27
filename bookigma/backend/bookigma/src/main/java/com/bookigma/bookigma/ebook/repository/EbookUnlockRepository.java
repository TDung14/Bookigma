package com.bookigma.bookigma.ebook.repository;

import com.bookigma.bookigma.ebook.entity.EbookUnlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EbookUnlockRepository extends JpaRepository<EbookUnlock, Long> {
    boolean existsByUser_IdAndBookId(Long userId, Long bookId);

    List<EbookUnlock> findByUser_IdOrderByCreatedAtDesc(Long userId);

    /** Số lượt mở khoá theo nguồn từ thời điểm cho trước (vd. lượt VIP trong tuần này). */
    long countByUser_IdAndSourceAndCreatedAtGreaterThanEqual(Long userId, String source, LocalDateTime from);
}
