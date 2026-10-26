package com.bookigma.bookigma.club.repository;

import com.bookigma.bookigma.club.entity.ClubJoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClubJoinRequestRepository extends JpaRepository<ClubJoinRequest, Long> {
    Optional<ClubJoinRequest> findFirstByClub_IdAndUser_IdAndStatusOrderByCreatedAtDesc(
            Long clubId, Long userId, ClubJoinRequest.Status status);

    List<ClubJoinRequest> findByClub_IdAndStatusOrderByCreatedAtAsc(Long clubId, ClubJoinRequest.Status status);

    List<ClubJoinRequest> findByUser_IdAndStatus(Long userId, ClubJoinRequest.Status status);

    long countByClub_IdAndStatus(Long clubId, ClubJoinRequest.Status status);

    Optional<ClubJoinRequest> findByIdAndClub_Id(Long id, Long clubId);
}
