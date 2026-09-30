package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.ExchangeListing;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExchangeListingRepository extends JpaRepository<ExchangeListing, Long> {
    @EntityGraph(attributePaths = "owner")
    List<ExchangeListing> findByStatusOrderByCreatedAtDesc(ExchangeListing.Status status);

    @EntityGraph(attributePaths = "owner")
    List<ExchangeListing> findByOwner_IdOrderByCreatedAtDesc(Long ownerId);
}
