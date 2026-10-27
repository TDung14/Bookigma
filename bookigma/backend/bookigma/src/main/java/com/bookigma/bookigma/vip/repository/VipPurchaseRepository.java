package com.bookigma.bookigma.vip.repository;

import com.bookigma.bookigma.vip.entity.VipPurchase;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VipPurchaseRepository extends JpaRepository<VipPurchase, Long> {

    Optional<VipPurchase> findByTransferCode(String transferCode);

    boolean existsByTransferCode(String transferCode);

    Optional<VipPurchase> findByProviderTransactionId(String providerTransactionId);

    Optional<VipPurchase> findFirstByUser_IdAndPlanIdAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
            Long userId,
            String planId,
            VipPurchase.Status status,
            LocalDateTime now
    );

    /** Đơn chờ thanh toán cùng gói và cùng mã gia hạn (hoặc cùng không có mã) để dùng lại thay vì tạo mới. */
    @Query("""
            select p from VipPurchase p
            where p.user.id = :userId
              and p.planId = :planId
              and p.status = :status
              and p.expiresAt > :now
              and ((:couponCode is null and p.couponCode is null) or p.couponCode = :couponCode)
            order by p.createdAt desc
            """)
    List<VipPurchase> findReusable(@Param("userId") Long userId,
                                   @Param("planId") String planId,
                                   @Param("couponCode") String couponCode,
                                   @Param("status") VipPurchase.Status status,
                                   @Param("now") LocalDateTime now);

    /** Mã gia hạn đang gắn với một đơn khác chưa thanh toán thì không dùng lại được. */
    boolean existsByCouponCodeAndStatusAndExpiresAtAfter(String couponCode, VipPurchase.Status status, LocalDateTime now);

    List<VipPurchase> findAllByOrderByCreatedAtDesc();

    List<VipPurchase> findByStatusOrderByCreatedAtDesc(VipPurchase.Status status);

    long countByStatus(VipPurchase.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from VipPurchase p where p.id = :id")
    Optional<VipPurchase> findByIdForUpdate(@Param("id") Long id);
}
