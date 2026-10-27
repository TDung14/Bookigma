package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {"user", "shop"})
    List<Order> findByUser_IdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "shop"})
    List<Order> findByShop_IdOrderByCreatedAtDesc(Long shopId);

    @EntityGraph(attributePaths = {"user", "shop"})
    List<Order> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"user", "shop"})
    Optional<Order> findWithDetailsById(Long id);

    boolean existsByCode(String code);

    /** Còn đơn nào khác (chưa hủy) đang dùng mã này không — dùng để hoàn voucher cá nhân khi hủy đơn. */
    boolean existsByVoucherCodeAndStatusNotAndIdNot(String voucherCode, Order.Status status, Long id);

    /** Như trên, cho voucher miễn phí vận chuyển. */
    boolean existsByShippingVoucherCodeAndStatusNotAndIdNot(String shippingVoucherCode, Order.Status status, Long id);

    /** Các đơn trả trước chưa nhận được tiền và đã quá hạn thanh toán. */
    @Query("""
            select o.id from Order o
            where o.status in :statuses
              and o.paymentMethod in :methods
              and o.paidAt is null
              and o.paymentExpiresAt is not null
              and o.paymentExpiresAt < :now
            """)
    List<Long> findExpiredUnpaidOrderIds(@Param("statuses") List<Order.Status> statuses,
                                         @Param("methods") List<Order.PaymentMethod> methods,
                                         @Param("now") LocalDateTime now);

    /** Tổng chi tiêu thật của từng người mua, chỉ tính đơn đã được shop xác nhận trở đi. */
    @Query("""
            select o.user.id as userId,
                   count(o) as orderCount,
                   sum(o.totalAmount) as totalSpent
            from Order o
            where o.status not in :excludedStatuses
            group by o.user.id
            """)
    List<BuyerAggregate> aggregateBuyers(@Param("excludedStatuses") List<Order.Status> excludedStatuses);

    interface BuyerAggregate {
        Long getUserId();

        Long getOrderCount();

        BigDecimal getTotalSpent();
    }

    long deleteByUser_Id(Long userId);
}
