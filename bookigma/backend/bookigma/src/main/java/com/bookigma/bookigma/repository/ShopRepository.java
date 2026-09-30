package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.Shop;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShopRepository extends JpaRepository<Shop, Long> {
    Optional<Shop> findByOwner_Id(Long ownerId);

    @EntityGraph(attributePaths = "owner")
    List<Shop> findAllByOrderByIdAsc();
}
