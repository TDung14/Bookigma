package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.CartItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @EntityGraph(attributePaths = {"book", "book.shop", "book.author", "blindBox"})
    List<CartItem> findByUserIdOrderByCreatedAtAscIdAsc(Long userId);

    Optional<CartItem> findByUserIdAndBook_Id(Long userId, Long bookId);

    Optional<CartItem> findByIdAndUserId(Long id, Long userId);

    boolean existsByBlindBox_Id(Long blindBoxId);

    void deleteByBook_Id(Long bookId);
}
