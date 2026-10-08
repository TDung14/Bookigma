package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Book;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {
    @EntityGraph(attributePaths = {"author", "category", "shop"})
    List<Book> findByStatusAndForSaleTrueOrderByCreatedAtDesc(Book.Status status);

    @EntityGraph(attributePaths = {"author", "category", "shop"})
    List<Book> findByStatusOrderByCreatedAtDesc(Book.Status status);

    @EntityGraph(attributePaths = {"author", "category", "shop"})
    List<Book> findByStatusAndForSaleTrueAndStockQuantityGreaterThan(Book.Status status, int minStock);

    @EntityGraph(attributePaths = {"author", "category", "shop"})
    List<Book> findByShop_IdOrderByCreatedAtDesc(Long shopId);

    @EntityGraph(attributePaths = {"author", "category", "shop"})
    List<Book> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"author", "category", "shop"})
    Optional<Book> findWithDetailsById(Long id);

    /**
     * Trừ tồn kho và cộng lượt bán trong một câu UPDATE có điều kiện: chỉ thành công khi còn đủ hàng,
     * nên hai người đặt cùng lúc không thể làm tồn kho bị âm. Trả về số dòng được cập nhật (0 = hết hàng).
     */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE Book b SET b.stockQuantity = b.stockQuantity - :quantity, b.soldCount = b.soldCount + :quantity "
            + "WHERE b.id = :bookId AND b.stockQuantity >= :quantity")
    int decreaseStock(@Param("bookId") Long bookId, @Param("quantity") int quantity);

    /** Hoàn lại tồn kho khi đơn bị hủy. */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE Book b SET b.stockQuantity = b.stockQuantity + :quantity, "
            + "b.soldCount = CASE WHEN b.soldCount >= :quantity THEN b.soldCount - :quantity ELSE 0 END "
            + "WHERE b.id = :bookId")
    int restoreStock(@Param("bookId") Long bookId, @Param("quantity") int quantity);
}
