package com.bookigma.bookigma.vip.service;

import com.bookigma.bookigma.exception.ApiException;

import java.util.List;

/**
 * Danh mục gói VIP do backend làm nguồn giá duy nhất. Frontend chỉ hiển thị,
 * mọi số tiền và quyền lợi khi kích hoạt đều lấy từ đây.
 */
public record VipPlan(
        String id,
        String name,
        long price,
        int days,
        int points,
        int pointBonusPercent,
        int extraShelves,
        int weeklyEbooks,
        int bookDiscounts,
        int freeSwaps,
        int renewalCodes
) {
    private static final List<VipPlan> PLANS = List.of(
            new VipPlan("month", "VIP 1 tháng", 49_000L, 30, 1_000, 0, 1, 1, 1, 1, 1),
            new VipPlan("quarter", "VIP 3 tháng", 129_000L, 90, 3_000, 5, 1, 1, 2, 3, 2),
            new VipPlan("year", "VIP 1 năm", 399_000L, 365, 5_000, 10, 2, 1, 14, 12, 3)
    );

    public static List<VipPlan> all() {
        return PLANS;
    }

    public static VipPlan require(String planId) {
        String normalized = planId == null ? "" : planId.trim().toLowerCase();
        return PLANS.stream()
                .filter(plan -> plan.id().equals(normalized))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("Gói VIP không hợp lệ."));
    }
}
