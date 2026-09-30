package com.bookigma.bookigma.entity;

import java.math.BigDecimal;

/**
 * Ba mức hộp Blind Book theo khoảng giá 80.000đ - 250.000đ trong báo cáo dự án.
 * Khoảng giá sách giúp hộp cao cấp ra sách xứng tầm (chỉ là tiêu chí cộng điểm, không phải điều kiện bắt buộc).
 */
public enum BlindBoxTier {
    MINI("mini", "Hộp Mini", 80_000, 0, 100_000),
    STANDARD("standard", "Hộp Tiêu Chuẩn", 150_000, 90_000, 180_000),
    PREMIUM("premium", "Hộp Cao Cấp", 250_000, 140_000, Long.MAX_VALUE);

    private final String id;
    private final String label;
    private final BigDecimal price;
    private final BigDecimal minBookPrice;
    private final BigDecimal maxBookPrice;

    BlindBoxTier(String id, String label, long price, long minBookPrice, long maxBookPrice) {
        this.id = id;
        this.label = label;
        this.price = BigDecimal.valueOf(price);
        this.minBookPrice = BigDecimal.valueOf(minBookPrice);
        this.maxBookPrice = BigDecimal.valueOf(maxBookPrice);
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public boolean fitsPrice(BigDecimal bookPrice) {
        return bookPrice != null
                && bookPrice.compareTo(minBookPrice) >= 0
                && bookPrice.compareTo(maxBookPrice) <= 0;
    }

    /** Nhận cả id viết thường ("mini") lẫn tên enum ("MINI"); trả về null nếu không khớp. */
    public static BlindBoxTier fromId(String value) {
        if (value == null) {
            return null;
        }
        for (BlindBoxTier tier : values()) {
            if (tier.id.equalsIgnoreCase(value.trim()) || tier.name().equalsIgnoreCase(value.trim())) {
                return tier;
            }
        }
        return null;
    }
}
