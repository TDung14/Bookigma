package com.bookigma.bookigma.vip.dto;

import com.bookigma.bookigma.ebook.dto.EbookDtos.WeeklyQuota;
import com.bookigma.bookigma.reward.dto.RewardDtos.UserVoucherDto;

import java.math.BigDecimal;
import java.util.List;

/** Dữ liệu các quyền lợi VIP đang dùng được của một người. */
public final class VipPerkDtos {
    private VipPerkDtos() {
    }

    /** Luật quyền lợi do server quyết định, để giao diện hiển thị đúng con số. */
    public record PerkRules(
            int exchangeOfferFee,
            int ebookUnlockPoints,
            int ebookPreviewChapters,
            List<Integer> dailyVoucherPercents,
            BigDecimal dailyVoucherMaxDiscount,
            int dailyVoucherValidDays,
            int bookDiscountPercent,
            BigDecimal bookDiscountMax,
            int renewalDiscountPercent,
            double freeAudioRateMax,
            double vipAudioRateMax
    ) {
    }

    public record DailyVoucherStatus(boolean claimedToday, UserVoucherDto voucher, long nextClaimAtEpochMs) {
    }

    public record PerkSummary(
            boolean vip,
            String planName,
            long expiresAtEpochMs,
            PerkRules rules,
            WeeklyQuota weeklyEbooks,
            int freeSwapsLeft,
            long bookDiscountVouchers,
            long renewalCodes,
            DailyVoucherStatus dailyVoucher
    ) {
    }
}
