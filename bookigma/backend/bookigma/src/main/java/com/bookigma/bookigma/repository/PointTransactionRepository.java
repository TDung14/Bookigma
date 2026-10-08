package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.PointTransaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {
    List<PointTransaction> findByUser_IdOrderByCreatedAtDesc(Long userId);
    List<PointTransaction> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    boolean existsByUser_IdAndTypeAndReferenceId(Long userId, String type, String referenceId);
    boolean existsByUser_IdAndTypeAndCreatedAtAfter(Long userId, String type, LocalDateTime after);
}
