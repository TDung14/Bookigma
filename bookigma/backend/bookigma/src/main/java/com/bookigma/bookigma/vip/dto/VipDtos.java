package com.bookigma.bookigma.vip.dto;

import java.time.LocalDateTime;

/** Dữ liệu trao đổi giữa frontend/admin và module VIP. */
public final class VipDtos {

    private VipDtos() {
    }

    /** couponCode: mã gia hạn VIP (giảm %), có thể bỏ trống. */
    public record CreatePurchaseRequest(String planId, String couponCode) {
    }

    public record AdminActionRequest(String note, String reference) {
    }

    public record SubscriptionResponse(
            boolean active,
            String planId,
            String planName,
            long price,
            long startedAtEpochMs,
            long expiresAtEpochMs,
            long daysLeft,
            int extraShelves,
            int pointBonusPercent,
            int weeklyEbooks,
            int bookDiscounts,
            int freeSwaps,
            int renewalCodes,
            boolean musicUnlocked
    ) {
    }

    public record PurchaseResponse(
            Long id,
            Long userId,
            String username,
            String fullName,
            String email,
            String planId,
            String planName,
            long amount,
            int durationDays,
            int points,
            int extraShelves,
            String status,
            String transferCode,
            String qrContent,
            String provider,
            String providerTransactionId,
            Long receivedAmount,
            LocalDateTime createdAt,
            LocalDateTime expiresAt,
            LocalDateTime paidAt,
            String note,
            SubscriptionResponse vip,
            long originalAmount,
            String couponCode
    ) {
    }

    public record BankTransferResult(
            boolean matched,
            String status,
            String message,
            Long purchaseId,
            Long expectedAmount,
            Long receivedAmount
    ) {
    }
}
