package com.bookigma.bookigma.reward.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class RewardDtos {
    private RewardDtos() {
    }

    @Data
    @Builder
    public static class RewardDto {
        private String id;
        private String emoji;
        private String name;
        private String desc;
        private Integer cost;
        private String type;
        private Integer value;
        private Integer minOrder;
    }

    @Data
    @Builder
    public static class RedemptionDto {
        private Long id;
        private String rewardId;
        private String name;
        private Integer cost;
        private String type;
        private String status;
        private String voucherCode;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class UserVoucherDto {
        private String code;
        private String label;
        private String type;
        private BigDecimal value;
        private BigDecimal maxDiscount;
        private BigDecimal minOrder;
        private LocalDateTime expiresAt;
    }

    @Data
    @Builder
    public static class RedeemResponse {
        private RedemptionDto redemption;
        private UserVoucherDto voucher;
        private Integer balanceAfter;
    }
}
