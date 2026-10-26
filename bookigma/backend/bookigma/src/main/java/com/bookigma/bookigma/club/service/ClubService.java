package com.bookigma.bookigma.club.service;

import com.bookigma.bookigma.club.dto.ClubDtos;

import java.util.List;

public interface ClubService {
    List<ClubDtos.ClubSummaryDto> listClubs(Long currentUserId, String query, String scope);

    ClubDtos.ClubDetailDto getClub(Long clubId, Long currentUserId);

    ClubDtos.ClubDetailDto createClub(Long currentUserId, ClubDtos.CreateClubRequest request);

    ClubDtos.ClubDetailDto updateClub(Long currentUserId, Long clubId, ClubDtos.UpdateClubRequest request);

    ClubDtos.ClubDetailDto joinClub(Long currentUserId, Long clubId, String message);

    ClubDtos.ClubDetailDto cancelJoinRequest(Long currentUserId, Long clubId);

    ClubDtos.ClubDetailDto leaveClub(Long currentUserId, Long clubId);

    List<ClubDtos.ClubMemberDto> getMembers(Long currentUserId, Long clubId);

    ClubDtos.ClubDetailDto updateMemberRole(Long currentUserId, Long clubId, Long memberUserId, String role);

    ClubDtos.ClubDetailDto removeMember(Long currentUserId, Long clubId, Long memberUserId);

    List<ClubDtos.JoinRequestDto> getJoinRequests(Long currentUserId, Long clubId);

    ClubDtos.JoinRequestDto resolveJoinRequest(Long currentUserId, Long clubId, Long requestId, boolean approve);
}
