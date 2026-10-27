package com.bookigma.bookigma.reward.repository;

import com.bookigma.bookigma.reward.entity.UserVoucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {

    List<UserVoucher> findByUser_IdOrderByCreatedAtDesc(Long userId);

    Optional<UserVoucher> findByUser_IdAndCodeIgnoreCase(Long userId, String code);

    Optional<UserVoucher> findByUser_IdAndCodeIgnoreCaseAndUsedFalse(Long userId, String code);

    long countByUser_IdAndUsedFalse(Long userId);

    boolean existsByCodeIgnoreCase(String code);

    /** Voucher mới nhất của một nguồn phát từ thời điểm cho trước (vd. voucher VIP hôm nay). */
    Optional<UserVoucher> findFirstByUser_IdAndSourceAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            Long userId, String source, LocalDateTime from);

    List<UserVoucher> findByUser_IdAndSourceAndUsedFalse(Long userId, String source);
}
