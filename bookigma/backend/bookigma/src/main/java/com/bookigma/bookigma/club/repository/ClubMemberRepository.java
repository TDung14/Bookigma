package com.bookigma.bookigma.club.repository;

import com.bookigma.bookigma.club.entity.ClubMember;
import com.bookigma.bookigma.club.entity.ClubMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClubMemberRepository extends JpaRepository<ClubMember, ClubMemberId> {
    Optional<ClubMember> findByClub_IdAndUser_Id(Long clubId, Long userId);

    boolean existsByClub_IdAndUser_Id(Long clubId, Long userId);

    List<ClubMember> findByClub_IdOrderByJoinedAtAsc(Long clubId);

    List<ClubMember> findByUser_Id(Long userId);

    long countByClub_Id(Long clubId);

    void deleteByClub_IdAndUser_Id(Long clubId, Long userId);
}
