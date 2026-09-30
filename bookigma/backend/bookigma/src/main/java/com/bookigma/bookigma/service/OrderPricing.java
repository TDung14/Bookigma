package com.bookigma.bookigma.service;

import com.bookigma.bookigma.entity.Voucher;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Quy tắc tính tiền khi thanh toán. Frontend (CheckoutPage) tính trước để hiển thị,
 * nhưng số tiền thật luôn do server tính lại theo các quy tắc dưới đây.
 */
public final class OrderPricing {
    /** Phí vận chuyển cho mỗi đơn (mỗi shop / mỗi hộp Blind Book là một kiện hàng). */
    public static final BigDecimal SHIPPING_FEE_PER_ORDER = BigDecimal.valueOf(25_000);

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private OrderPricing() {
    }

    /** Tổng số tiền được giảm của cả lần thanh toán (voucher SHIPPING giảm phí ship chứ không giảm tiền hàng). */
    public static BigDecimal discountFor(Voucher voucher, BigDecimal subtotal) {
        if (voucher == null || subtotal.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal discount = switch (voucher.getDiscountType()) {
            case PERCENT -> {
                BigDecimal percent = subtotal.multiply(voucher.getDiscountValue())
                        .divide(HUNDRED, 0, RoundingMode.HALF_UP);
                yield voucher.getMaxDiscount() == null ? percent : percent.min(voucher.getMaxDiscount());
            }
            case AMOUNT -> voucher.getDiscountValue();
            case SHIPPING -> BigDecimal.ZERO;
        };
        return discount.min(subtotal).max(BigDecimal.ZERO);
    }

    /**
     * Chia tổng tiền giảm cho từng đơn theo tỉ lệ tạm tính. Đơn cuối nhận phần còn lại để tổng
     * khớp tuyệt đối; không đơn nào bị giảm quá giá trị hàng của chính nó.
     */
    public static List<BigDecimal> allocate(BigDecimal totalDiscount, List<BigDecimal> subtotals) {
        List<BigDecimal> shares = new ArrayList<>(subtotals.size());
        BigDecimal sum = subtotals.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalDiscount.signum() <= 0 || sum.signum() <= 0) {
            subtotals.forEach(subtotal -> shares.add(BigDecimal.ZERO));
            return shares;
        }

        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < subtotals.size(); i++) {
            BigDecimal subtotal = subtotals.get(i);
            BigDecimal share = i == subtotals.size() - 1
                    ? totalDiscount.subtract(allocated)
                    : totalDiscount.multiply(subtotal).divide(sum, 0, RoundingMode.DOWN);
            share = share.min(subtotal).max(BigDecimal.ZERO);
            shares.add(share);
            allocated = allocated.add(share);
        }
        return shares;
    }
}
