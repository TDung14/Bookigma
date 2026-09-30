package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Order;
import com.bookigma.bookigma.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    boolean existsByBook_Id(Long bookId);

    /** Những cuốn người dùng đã mua (kể cả sách nằm trong hộp Blind Book), bỏ qua đơn đã hủy. */
    @Query("SELECT DISTINCT i.book.id FROM OrderItem i WHERE i.order.user.id = :userId AND i.order.status <> :excluded")
    List<Long> findPurchasedBookIds(@Param("userId") Long userId, @Param("excluded") Order.Status excluded);
}
