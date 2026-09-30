package com.bookigma.bookigma.repository;

import com.bookigma.bookigma.entity.ExchangeOffer;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExchangeOfferRepository extends JpaRepository<ExchangeOffer, Long> {
    /** Đếm số đề nghị theo từng tin đăng, trả về các cặp [listingId, count]. */
    @Query("SELECT o.listing.id, COUNT(o) FROM ExchangeOffer o WHERE o.status = :status GROUP BY o.listing.id")
    List<Object[]> countByStatusGroupByListing(@Param("status") ExchangeOffer.Status status);

    @EntityGraph(attributePaths = {"listing", "listing.owner", "sender"})
    List<ExchangeOffer> findBySender_IdOrderByCreatedAtDesc(Long senderId);

    @EntityGraph(attributePaths = {"listing", "listing.owner", "sender"})
    Optional<ExchangeOffer> findWithListingById(Long id);

    @EntityGraph(attributePaths = "sender")
    List<ExchangeOffer> findByListing_IdAndStatus(Long listingId, ExchangeOffer.Status status);

    boolean existsByListing_IdAndSender_IdAndStatus(Long listingId, Long senderId, ExchangeOffer.Status status);
}
