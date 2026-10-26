package com.bookigma.bookigma.reward.service;

import java.util.Arrays;
import java.util.Optional;

/**
 * Danh mục quà đổi bằng điểm. Mức giá và giá trị do server quyết định để client
 * không thể tự đặt số điểm phải trả hay giá trị voucher.
 */
public enum RewardItem {
    BOOKMARK("bookmark", "🔖", "Bookmark kim loại",
            "Quà thật, giao kèm đơn hàng kế tiếp", 300, RewardRedemptionType.PHYSICAL, null, null),
    VOUCHER20("voucher20", "🎟️", "Voucher 20.000đ",
            "Áp dụng cho đơn từ 100.000đ", 500, RewardRedemptionType.VOUCHER, 20_000, 100_000),
    TOTE("tote", "👜", "Túi tote Bookigma",
            "Quà thật, bản giới hạn", 1_200, RewardRedemptionType.PHYSICAL, null, null),
    VOUCHER50("voucher50", "🎫", "Voucher 50.000đ",
            "Áp dụng cho đơn từ 200.000đ", 1_400, RewardRedemptionType.VOUCHER, 50_000, 200_000),
    FREEBOOK("freebook", "📗", "Một cuốn sách dưới 100.000đ",
            "Tự chọn trong cửa hàng", 3_000, RewardRedemptionType.PHYSICAL, null, null);

    /** Loại quà, tách khỏi entity để enum danh mục không phụ thuộc JPA. */
    public enum RewardRedemptionType {
        VOUCHER, PHYSICAL
    }

    private final String id;
    private final String emoji;
    private final String name;
    private final String description;
    private final int cost;
    private final RewardRedemptionType type;
    private final Integer value;
    private final Integer minOrder;

    RewardItem(String id, String emoji, String name, String description,
               int cost, RewardRedemptionType type, Integer value, Integer minOrder) {
        this.id = id;
        this.emoji = emoji;
        this.name = name;
        this.description = description;
        this.cost = cost;
        this.type = type;
        this.value = value;
        this.minOrder = minOrder;
    }

    public String id() {
        return id;
    }

    public String emoji() {
        return emoji;
    }

    public String title() {
        return name;
    }

    public String description() {
        return description;
    }

    public int cost() {
        return cost;
    }

    public RewardRedemptionType type() {
        return type;
    }

    public Integer value() {
        return value;
    }

    public Integer minOrder() {
        return minOrder;
    }

    public static Optional<RewardItem> find(String raw) {
        if (raw == null || raw.isBlank()) return Optional.empty();
        String normalized = raw.trim().toLowerCase(java.util.Locale.ROOT);
        return Arrays.stream(values()).filter(item -> item.id.equals(normalized)).findFirst();
    }
}
