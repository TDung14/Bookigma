package com.bookigma.bookigma.vip.repository;

import com.bookigma.bookigma.vip.entity.VipSubscription;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VipSubscriptionRepository extends JpaRepository<VipSubscription, Long> {

    Optional<VipSubscription> findByUser_Id(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from VipSubscription s where s.user.id = :userId")
    Optional<VipSubscription> findByUserIdForUpdate(@Param("userId") Long userId);
}
