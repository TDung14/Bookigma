package com.bookigma.bookigma.progress.repository;

import com.bookigma.bookigma.progress.entity.ReadingProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, Long> {

    List<ReadingProgress> findByUser_IdOrderByLastReadAtDesc(Long userId);

    Optional<ReadingProgress> findByUser_IdAndBook_Id(Long userId, Long bookId);

    long countByUser_IdAndFinishedTrue(Long userId);

    long countByUser_Id(Long userId);

    /** Tổng hợp số sách đã đọc / đã xong / thời gian đọc của mọi tài khoản cho bảng xếp hạng. */
    @Query("""
            select rp.user.id as userId,
                   count(rp) as booksStarted,
                   sum(case when rp.finished = true then 1 else 0 end) as booksFinished,
                   sum(rp.secondsRead) as secondsRead
            from ReadingProgress rp
            group by rp.user.id
            """)
    List<ReaderAggregate> aggregateReaders();

    interface ReaderAggregate {
        Long getUserId();

        Long getBooksStarted();

        Long getBooksFinished();

        Long getSecondsRead();
    }
}
