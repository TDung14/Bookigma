package com.bookigma.bookigma.club.controller;

import com.bookigma.bookigma.club.dto.ClubDtos;
import com.bookigma.bookigma.club.service.ClubService;
import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.PostRequestDto;
import com.bookigma.bookigma.dto.PostResponseDto;
import com.bookigma.bookigma.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs")
@CrossOrigin(origins = "*")
public class ClubController {
    private final ClubService clubService;
    private final PostService postService;

    public ClubController(ClubService clubService, PostService postService) {
        this.clubService = clubService;
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<List<ClubDtos.ClubSummaryDto>> listClubs(
            @CurrentUserId(required = false) Long currentUserId,
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "scope", required = false, defaultValue = "all") String scope) {
        return ResponseEntity.ok(clubService.listClubs(currentUserId, query, scope));
    }

    @PostMapping
    public ResponseEntity<ClubDtos.ClubDetailDto> createClub(
            @CurrentUserId Long currentUserId,
            @Valid @RequestBody ClubDtos.CreateClubRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clubService.createClub(currentUserId, request));
    }

    @GetMapping("/{clubId}")
    public ResponseEntity<ClubDtos.ClubDetailDto> getClub(
            @CurrentUserId(required = false) Long currentUserId,
            @PathVariable Long clubId) {
        return ResponseEntity.ok(clubService.getClub(clubId, currentUserId));
    }

    @PatchMapping("/{clubId}")
    public ResponseEntity<ClubDtos.ClubDetailDto> updateClub(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @Valid @RequestBody ClubDtos.UpdateClubRequest request) {
        return ResponseEntity.ok(clubService.updateClub(currentUserId, clubId, request));
    }

    @PostMapping("/{clubId}/join")
    public ResponseEntity<ClubDtos.ClubDetailDto> joinClub(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @RequestBody(required = false) ClubDtos.JoinClubRequest request) {
        return ResponseEntity.ok(clubService.joinClub(
                currentUserId, clubId, request == null ? null : request.getMessage()));
    }

    @DeleteMapping("/{clubId}/leave")
    public ResponseEntity<ClubDtos.ClubDetailDto> leaveClub(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId) {
        return ResponseEntity.ok(clubService.leaveClub(currentUserId, clubId));
    }

    @DeleteMapping("/{clubId}/requests/me")
    public ResponseEntity<ClubDtos.ClubDetailDto> cancelJoinRequest(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId) {
        return ResponseEntity.ok(clubService.cancelJoinRequest(currentUserId, clubId));
    }

    @PatchMapping("/{clubId}/members/{memberUserId}")
    public ResponseEntity<ClubDtos.ClubDetailDto> updateMemberRole(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @PathVariable Long memberUserId,
            @Valid @RequestBody ClubDtos.UpdateMemberRoleRequest request) {
        return ResponseEntity.ok(
                clubService.updateMemberRole(currentUserId, clubId, memberUserId, request.getRole()));
    }

    @DeleteMapping("/{clubId}/members/{memberUserId}")
    public ResponseEntity<ClubDtos.ClubDetailDto> removeMember(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @PathVariable Long memberUserId) {
        return ResponseEntity.ok(clubService.removeMember(currentUserId, clubId, memberUserId));
    }

    @GetMapping("/{clubId}/members")
    public ResponseEntity<List<ClubDtos.ClubMemberDto>> getMembers(
            @CurrentUserId(required = false) Long currentUserId,
            @PathVariable Long clubId) {
        return ResponseEntity.ok(clubService.getMembers(currentUserId, clubId));
    }

    @GetMapping("/{clubId}/requests")
    public ResponseEntity<List<ClubDtos.JoinRequestDto>> getJoinRequests(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId) {
        return ResponseEntity.ok(clubService.getJoinRequests(currentUserId, clubId));
    }

    @PostMapping("/{clubId}/requests/{requestId}/approve")
    public ResponseEntity<ClubDtos.JoinRequestDto> approveRequest(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @PathVariable Long requestId) {
        return ResponseEntity.ok(clubService.resolveJoinRequest(currentUserId, clubId, requestId, true));
    }

    @PostMapping("/{clubId}/requests/{requestId}/reject")
    public ResponseEntity<ClubDtos.JoinRequestDto> rejectRequest(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @PathVariable Long requestId) {
        return ResponseEntity.ok(clubService.resolveJoinRequest(currentUserId, clubId, requestId, false));
    }

    @GetMapping("/{clubId}/posts")
    public ResponseEntity<List<PostResponseDto>> getClubPosts(
            @CurrentUserId(required = false) Long currentUserId,
            @PathVariable Long clubId) {
        return ResponseEntity.ok(postService.getClubPosts(currentUserId, clubId));
    }

    @PostMapping("/{clubId}/posts")
    public ResponseEntity<PostResponseDto> createClubPost(
            @CurrentUserId Long currentUserId,
            @PathVariable Long clubId,
            @Valid @RequestBody PostRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.createClubPost(currentUserId, clubId, request));
    }
}
