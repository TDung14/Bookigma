package com.bookigma.bookigma.reward.dto;

import com.bookigma.bookigma.reward.entity.UserVoucher;
import com.bookigma.bookigma.service.DtoMapper;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

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
        /** reward | vip_perk | vip_daily | vip_renewal */
        private String source;
        /** order: dùng cho đơn sách; vip: chỉ giảm giá khi mua VIP. */
        private String scope;
        private LocalDateTime createdAt;

        public static UserVoucherDto from(UserVoucher voucher) {
            String source = voucher.getSource() == null ? UserVoucher.SOURCE_REWARD : voucher.getSource();
            return UserVoucherDto.builder()
                    .code(voucher.getCode())
                    .label(voucher.getLabel())
                    .type(DtoMapper.lower(voucher.getDiscountType()))
                    .value(voucher.getDiscountValue())
                    .maxDiscount(voucher.getMaxDiscount())
                    .minOrder(voucher.getMinOrderAmount())
                    .expiresAt(voucher.getExpiresAt())
                    .source(source.toLowerCase(Locale.ROOT))
                    .scope(voucher.isVipRenewal() ? "vip" : "order")
                    .createdAt(voucher.getCreatedAt())
                    .build();
        }
    }

    @Data
    @Builder
    public static class RedeemResponse {
        private RedemptionDto redemption;
        private UserVoucherDto voucher;
        private Integer balanceAfter;
    }
}
