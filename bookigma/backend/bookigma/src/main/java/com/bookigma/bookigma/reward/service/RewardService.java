package com.bookigma.bookigma.reward.service;

import com.bookigma.bookigma.reward.dto.RewardDtos;

import java.util.List;

public interface RewardService {
    List<RewardDtos.RewardDto> getCatalog();

    List<RewardDtos.RedemptionDto> getRedemptions(Long userId);

    /** Các voucher cá nhân còn dùng được (chưa dùng, chưa hết hạn). */
    List<RewardDtos.UserVoucherDto> getAvailableVouchers(Long userId);

    RewardDtos.RedeemResponse redeem(Long userId, String rewardId);
}
