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

    List<VipPurchase> findAllByOrderByCreatedAtDesc();

    List<VipPurchase> findByStatusOrderByCreatedAtDesc(VipPurchase.Status status);

    long countByStatus(VipPurchase.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from VipPurchase p where p.id = :id")
    Optional<VipPurchase> findByIdForUpdate(@Param("id") Long id);
}
