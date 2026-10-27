package com.bookigma.bookigma.vip.service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Luật các quyền lợi VIP và các khoản phí liên quan, do server quyết định.
 * Frontend đọc lại qua GET /api/vip/perks nên chỉ cần đổi ở đây.
 */
public final class VipPerkRules {
    private VipPerkRules() {
    }

    /** Voucher VIP mỗi ngày: giảm ngẫu nhiên một trong các mức này, có trần tiền giảm. */
    public static final List<Integer> DAILY_VOUCHER_PERCENTS = List.of(10, 15, 20, 25, 30);
    public static final BigDecimal DAILY_VOUCHER_MAX_DISCOUNT = BigDecimal.valueOf(50_000);
    public static final int DAILY_VOUCHER_VALID_DAYS = 3;

    /** Mã giảm giá mua sách tặng theo gói VIP (số lượng theo gói), dùng được đến khi hết hạn VIP. */
    public static final int BOOK_DISCOUNT_PERCENT = 20;
    public static final BigDecimal BOOK_DISCOUNT_MAX = BigDecimal.valueOf(50_000);

    /** Mã gia hạn: giảm % cho lần mua hoặc gia hạn VIP tiếp theo. */
    public static final int RENEWAL_DISCOUNT_PERCENT = 10;
    public static final int RENEWAL_VALID_DAYS = 365;

    /** Ebook premium: số chương đọc thử và giá mở khoá cả cuốn bằng điểm. */
    public static final int EBOOK_PREVIEW_CHAPTERS = 3;
    public static final int EBOOK_UNLOCK_POINTS = 3_000;

    /** Phí gửi một đề nghị trao đổi sách, hoàn lại nếu đề nghị không được chấp nhận. */
    public static final int EXCHANGE_OFFER_FEE = 500;

    /** Tốc độ tối đa của chế độ đọc tự động (sách nói). */
    public static final double FREE_AUDIO_RATE_MAX = 2.0;
    public static final double VIP_AUDIO_RATE_MAX = 3.0;
}
