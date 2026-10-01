package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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

    long deleteByUser_Id(Long userId);
}
