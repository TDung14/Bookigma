package com.bookigma.bookigma.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Quét định kỳ các đơn QR chưa thanh toán để nhả hàng tồn, điểm và voucher đang bị giữ. */
@Component
public class OrderExpiryJob {
    private static final Logger log = LoggerFactory.getLogger(OrderExpiryJob.class);

    private final OrderService orderService;

    public OrderExpiryJob(OrderService orderService) {
        this.orderService = orderService;
    }

    @Scheduled(initialDelayString = "PT30S", fixedDelayString = "PT1M")
    public void expireUnpaidOrders() {
        try {
            int expired = orderService.expireUnpaidOrders();
            if (expired > 0) {
                log.info("Đã tự hủy {} đơn QR quá hạn thanh toán", expired);
            }
        } catch (RuntimeException ex) {
            log.error("Không thể quét đơn QR quá hạn thanh toán", ex);
        }
    }
}
