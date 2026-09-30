package com.bookigma.bookigma.service;

import com.bookigma.bookigma.entity.Voucher;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderPricingTest {

    private static Voucher voucher(Voucher.DiscountType type, long value, Long maxDiscount) {
        return Voucher.builder()
                .code("TEST")
                .label("test")
                .discountType(type)
                .discountValue(BigDecimal.valueOf(value))
                .maxDiscount(maxDiscount == null ? null : BigDecimal.valueOf(maxDiscount))
                .minOrderAmount(BigDecimal.ZERO)
                .build();
    }

    private static BigDecimal vnd(long amount) {
        return BigDecimal.valueOf(amount);
    }

    @Test
    void percentVoucherIsCappedAtMaxDiscount() {
        Voucher tenPercentMax30k = voucher(Voucher.DiscountType.PERCENT, 10, 30_000L);
        assertEquals(0, vnd(30_000).compareTo(OrderPricing.discountFor(tenPercentMax30k, vnd(512_000))));
    }

    @Test
    void percentVoucherRoundsHalfUpLikeTheCheckoutPage() {
        Voucher tenPercent = voucher(Voucher.DiscountType.PERCENT, 10, 30_000L);
        // 10% của 123.455đ = 12.345,5đ -> 12.346đ (Math.round ở frontend cũng ra 12.346)
        assertEquals(0, vnd(12_346).compareTo(OrderPricing.discountFor(tenPercent, vnd(123_455))));
    }

    @Test
    void amountVoucherNeverExceedsSubtotal() {
        Voucher fiftyK = voucher(Voucher.DiscountType.AMOUNT, 50_000, null);
        assertEquals(0, vnd(40_000).compareTo(OrderPricing.discountFor(fiftyK, vnd(40_000))));
    }

    @Test
    void shippingVoucherAndNoVoucherGiveNoDiscountOnGoods() {
        assertEquals(0, BigDecimal.ZERO.compareTo(
                OrderPricing.discountFor(voucher(Voucher.DiscountType.SHIPPING, 0, null), vnd(200_000))));
        assertEquals(0, BigDecimal.ZERO.compareTo(OrderPricing.discountFor(null, vnd(200_000))));
    }

    @Test
    void allocationIsProportionalAndSumsExactly() {
        List<BigDecimal> subtotals = List.of(vnd(267_000), vnd(95_000), vnd(150_000));
        List<BigDecimal> shares = OrderPricing.allocate(vnd(30_000), subtotals);

        BigDecimal sum = shares.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, vnd(30_000).compareTo(sum));
        assertEquals(0, vnd(15_644).compareTo(shares.get(0))); // 30000 * 267000 / 512000, làm tròn xuống
        assertEquals(0, vnd(5_566).compareTo(shares.get(1)));
        for (int i = 0; i < shares.size(); i++) {
            assertTrue(shares.get(i).compareTo(subtotals.get(i)) <= 0);
        }
    }

    @Test
    void allocationOfZeroDiscountIsAllZeros() {
        List<BigDecimal> shares = OrderPricing.allocate(BigDecimal.ZERO, List.of(vnd(100_000), vnd(50_000)));
        assertTrue(shares.stream().allMatch(share -> share.signum() == 0));
    }
}
