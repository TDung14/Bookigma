package com.bookigma.bookigma.reward.repository;

import com.bookigma.bookigma.reward.entity.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, Long> {
    List<RewardRedemption> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
