package com.bookigma.bookigma.club.service.impl;

import com.bookigma.bookigma.club.dto.ClubDtos;
import com.bookigma.bookigma.club.entity.BookClub;
import com.bookigma.bookigma.club.entity.ClubJoinRequest;
import com.bookigma.bookigma.club.entity.ClubMember;
import com.bookigma.bookigma.club.entity.ClubMemberId;
import com.bookigma.bookigma.club.repository.BookClubRepository;
import com.bookigma.bookigma.club.repository.ClubJoinRequestRepository;
import com.bookigma.bookigma.club.repository.ClubMemberRepository;
import com.bookigma.bookigma.club.service.ClubAccessService;
import com.bookigma.bookigma.club.service.ClubService;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ClubServiceImpl implements ClubService {
    private final BookClubRepository clubRepository;
    private final ClubMemberRepository memberRepository;
    private final ClubJoinRequestRepository joinRequestRepository;
    private final PostRepository postRepository;
    private final ClubAccessService clubAccess;
    private final NotificationService notificationService;

    public ClubServiceImpl(BookClubRepository clubRepository,
                           ClubMemberRepository memberRepository,
                           ClubJoinRequestRepository joinRequestRepository,
                           PostRepository postRepository,
                           ClubAccessService clubAccess,
                           NotificationService notificationService) {
        this.clubRepository = clubRepository;
        this.memberRepository = memberRepository;
        this.joinRequestRepository = joinRequestRepository;
        this.postRepository = postRepository;
        this.clubAccess = clubAccess;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClubDtos.ClubSummaryDto> listClubs(Long currentUserId, String query, String scope) {
        String keyword = query == null ? "" : query.trim();
        List<BookClub> clubs = keyword.isEmpty()
                ? clubRepository.findAllByOrderByCreatedAtDesc()
                : clubRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrderByCreatedAtDesc(
                        keyword, keyword);

        Map<Long, String> myRoles = currentUserId == null
                ? Map.of()
                : memberRepository.findByUser_Id(currentUserId).stream()
                        .collect(Collectors.toMap(
                                member -> member.getClub().getId(),
                                member -> member.getRole().name(),
                                (first, second) -> first));
        Set<Long> pendingClubIds = currentUserId == null
                ? Set.of()
                : joinRequestRepository.findByUser_IdAndStatus(currentUserId, ClubJoinRequest.Status.PENDING)
                        .stream()
                        .map(request -> request.getClub().getId())
                        .collect(Collectors.toSet());

        String normalizedScope = scope == null ? "all" : scope.trim().toLowerCase(Locale.ROOT);
        return clubs.stream()
                .filter(club -> matchesScope(club, normalizedScope, currentUserId, myRoles))
                .map(club -> toSummary(club, currentUserId, myRoles, pendingClubIds))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ClubDtos.ClubDetailDto getClub(Long clubId, Long currentUserId) {
        return buildDetail(clubAccess.requireClub(clubId), currentUserId);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto createClub(Long currentUserId, ClubDtos.CreateClubRequest request) {
        User user = clubAccess.requireUser(currentUserId);
        String name = normalizeName(request == null ? null : request.getName());

        BookClub club = clubRepository.save(BookClub.builder()
                .name(name)
                .description(blankToNull(request.getDescription()))
                .coverUrl(blankToNull(request.getCoverUrl()))
                .owner(user)
                .privateClub(Boolean.TRUE.equals(request.getPrivateClub()))
                .build());

        memberRepository.save(ClubMember.builder()
                .id(new ClubMemberId(club.getId(), user.getId()))
                .club(club)
                .user(user)
                .role(ClubMember.Role.OWNER)
                .build());

        return buildDetail(club, currentUserId);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto updateClub(Long currentUserId, Long clubId, ClubDtos.UpdateClubRequest request) {
        clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        clubAccess.requireManager(club, currentUserId);

        if (request != null) {
            if (request.getName() != null) {
                club.setName(normalizeName(request.getName()));
            }
            if (request.getDescription() != null) {
                club.setDescription(blankToNull(request.getDescription()));
            }
            if (request.getCoverUrl() != null) {
                club.setCoverUrl(blankToNull(request.getCoverUrl()));
            }
            if (request.getPrivateClub() != null) {
                club.setPrivateClub(request.getPrivateClub());
            }
        }

        clubRepository.save(club);
        return buildDetail(club, currentUserId);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto joinClub(Long currentUserId, Long clubId, String message) {
        User user = clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);

        if (club.getOwner().getId().equals(currentUserId)
                || memberRepository.existsByClub_IdAndUser_Id(clubId, currentUserId)) {
            return buildDetail(club, currentUserId);
        }

        boolean alreadyPending = joinRequestRepository
                .findFirstByClub_IdAndUser_IdAndStatusOrderByCreatedAtDesc(
                        clubId, currentUserId, ClubJoinRequest.Status.PENDING)
                .isPresent();
        if (!alreadyPending) {
            joinRequestRepository.save(ClubJoinRequest.builder()
                    .club(club)
                    .user(user)
                    .message(blankToNull(message))
                    .status(ClubJoinRequest.Status.PENDING)
                    .build());
            notifyManagersOfJoinRequest(club, user);
        }

        return buildDetail(club, currentUserId);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto cancelJoinRequest(Long currentUserId, Long clubId) {
        clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        joinRequestRepository.findFirstByClub_IdAndUser_IdAndStatusOrderByCreatedAtDesc(
                        clubId, currentUserId, ClubJoinRequest.Status.PENDING)
                .ifPresent(joinRequestRepository::delete);
        return buildDetail(club, currentUserId);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto leaveClub(Long currentUserId, Long clubId) {
        clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        ClubMember member = clubAccess.requireMember(clubId, currentUserId);

        if (member.getRole() == ClubMember.Role.OWNER || club.getOwner().getId().equals(currentUserId)) {
            throw ApiException.badRequest("Chủ nhóm không thể rời nhóm. Hãy chuyển quyền chủ nhóm trước.");
        }

        memberRepository.delete(member);
        return buildDetail(club, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClubDtos.ClubMemberDto> getMembers(Long currentUserId, Long clubId) {
        BookClub club = clubAccess.requireClub(clubId);
        if (Boolean.TRUE.equals(club.getPrivateClub()) && !clubAccess.isMember(clubId, currentUserId)) {
            throw ApiException.forbidden("Nhóm này ở chế độ riêng tư. Hãy tham gia để xem thành viên.");
        }
        return sortedMembers(clubId).stream().map(this::toMemberDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClubDtos.JoinRequestDto> getJoinRequests(Long currentUserId, Long clubId) {
        BookClub club = clubAccess.requireClub(clubId);
        clubAccess.requireManager(club, currentUserId);
        return joinRequestRepository
                .findByClub_IdAndStatusOrderByCreatedAtAsc(clubId, ClubJoinRequest.Status.PENDING)
                .stream()
                .map(this::toJoinRequestDto)
                .toList();
    }

    @Override
    @Transactional
    public ClubDtos.JoinRequestDto resolveJoinRequest(Long currentUserId,
                                                      Long clubId,
                                                      Long requestId,
                                                      boolean approve) {
        clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        clubAccess.requireManager(club, currentUserId);

        ClubJoinRequest request = joinRequestRepository.findByIdAndClub_Id(requestId, clubId)
                .orElseThrow(() -> ApiException.notFound("Yêu cầu tham gia không tồn tại."));
        if (request.getStatus() != ClubJoinRequest.Status.PENDING) {
            throw ApiException.badRequest("Yêu cầu này đã được xử lý trước đó.");
        }

        if (approve && !memberRepository.existsByClub_IdAndUser_Id(clubId, request.getUser().getId())) {
            memberRepository.save(ClubMember.builder()
                    .id(new ClubMemberId(clubId, request.getUser().getId()))
                    .club(club)
                    .user(request.getUser())
                    .role(ClubMember.Role.MEMBER)
                    .build());
        }

        request.setStatus(approve ? ClubJoinRequest.Status.APPROVED : ClubJoinRequest.Status.REJECTED);
        request.setResolvedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        joinRequestRepository.save(request);

        String message = approve
                ? "Yêu cầu tham gia nhóm \"" + club.getName() + "\" của bạn đã được duyệt."
                : "Yêu cầu tham gia nhóm \"" + club.getName() + "\" của bạn đã bị từ chối.";
        notificationService.createNotification(
                request.getUser().getId(),
                message,
                approve ? "/clubs/" + clubId : "/clubs");

        return toJoinRequestDto(request);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto updateMemberRole(Long currentUserId,
                                                   Long clubId,
                                                   Long memberUserId,
                                                   String role) {
        clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        requireOwner(club, currentUserId);

        if (club.getOwner().getId().equals(memberUserId)) {
            throw ApiException.badRequest("Không thể thay đổi vai trò của chủ nhóm.");
        }
        ClubMember target = memberRepository.findByClub_IdAndUser_Id(clubId, memberUserId)
                .orElseThrow(() -> ApiException.notFound("Người này không phải thành viên của nhóm."));
        if (target.getRole() == ClubMember.Role.OWNER) {
            throw ApiException.badRequest("Không thể thay đổi vai trò của chủ nhóm.");
        }

        ClubMember.Role nextRole = switch (role == null ? "" : role.trim().toUpperCase(Locale.ROOT)) {
            case "ADMIN" -> ClubMember.Role.ADMIN;
            case "MEMBER" -> ClubMember.Role.MEMBER;
            default -> throw ApiException.badRequest("Vai trò nhóm không hợp lệ.");
        };

        if (target.getRole() != nextRole) {
            target.setRole(nextRole);
            memberRepository.save(target);
            notificationService.createNotification(
                    target.getUser().getId(),
                    nextRole == ClubMember.Role.ADMIN
                            ? "Bạn đã được bổ nhiệm làm quản trị viên nhóm \"" + club.getName() + "\"."
                            : "Bạn đã được chuyển thành thành viên nhóm \"" + club.getName() + "\".",
                    "/clubs/" + clubId);
        }
        return buildDetail(club, currentUserId);
    }

    @Override
    @Transactional
    public ClubDtos.ClubDetailDto removeMember(Long currentUserId, Long clubId, Long memberUserId) {
        clubAccess.requireUser(currentUserId);
        BookClub club = clubAccess.requireClub(clubId);
        clubAccess.requireManager(club, currentUserId);

        if (currentUserId.equals(memberUserId)) {
            throw ApiException.badRequest("Hãy dùng chức năng rời nhóm nếu bạn muốn rời khỏi nhóm.");
        }
        if (club.getOwner().getId().equals(memberUserId)) {
            throw ApiException.badRequest("Không thể xóa chủ nhóm khỏi nhóm.");
        }

        ClubMember target = memberRepository.findByClub_IdAndUser_Id(clubId, memberUserId)
                .orElseThrow(() -> ApiException.notFound("Người này không phải thành viên của nhóm."));
        boolean actorIsOwner = club.getOwner().getId().equals(currentUserId)
                || memberRepository.findByClub_IdAndUser_Id(clubId, currentUserId)
                        .map(member -> member.getRole() == ClubMember.Role.OWNER)
                        .orElse(false);
        if (!actorIsOwner && target.getRole() == ClubMember.Role.ADMIN) {
            throw ApiException.forbidden("Quản trị viên không thể xóa quản trị viên khác.");
        }

        memberRepository.delete(target);
        notificationService.createNotification(
                target.getUser().getId(),
                "Bạn đã được xóa khỏi nhóm \"" + club.getName() + "\".",
                "/clubs");
        return buildDetail(club, currentUserId);
    }

    private boolean matchesScope(BookClub club,
                                 String scope,
                                 Long currentUserId,
                                 Map<Long, String> myRoles) {
        boolean owner = currentUserId != null && club.getOwner().getId().equals(currentUserId);
        return switch (scope) {
            case "joined" -> owner || myRoles.containsKey(club.getId());
            case "mine" -> owner;
            case "public" -> !Boolean.TRUE.equals(club.getPrivateClub());
            case "private" -> Boolean.TRUE.equals(club.getPrivateClub());
            default -> true;
        };
    }

    private ClubDtos.ClubSummaryDto toSummary(BookClub club,
                                             Long currentUserId,
                                             Map<Long, String> myRoles,
                                             Set<Long> pendingClubIds) {
        boolean owner = currentUserId != null && club.getOwner().getId().equals(currentUserId);
        String myRole = myRoles.get(club.getId());
        if (myRole == null && owner) {
            myRole = ClubMember.Role.OWNER.name();
        }
        boolean manager = ClubMember.Role.OWNER.name().equals(myRole)
                || ClubMember.Role.ADMIN.name().equals(myRole);
        long pendingRequestCount = manager
                ? joinRequestRepository.countByClub_IdAndStatus(club.getId(), ClubJoinRequest.Status.PENDING)
                : 0;
        return ClubDtos.ClubSummaryDto.builder()
                .id(club.getId())
                .name(club.getName())
                .description(club.getDescription())
                .coverUrl(club.getCoverUrl())
                .ownerId(club.getOwner().getId())
                .ownerName(displayName(club.getOwner()))
                .ownerAvatarUrl(club.getOwner().getAvatarUrl())
                .privateClub(Boolean.TRUE.equals(club.getPrivateClub()))
                .memberCount(memberRepository.countByClub_Id(club.getId()))
                .postCount(postRepository.countByClubId(club.getId()))
                .joined(myRole != null)
                .owner(owner)
                .pendingRequest(pendingClubIds.contains(club.getId()))
                .pendingRequestCount(pendingRequestCount)
                .myRole(myRole)
                .createdAt(club.getCreatedAt())
                .build();
    }

    private ClubDtos.ClubDetailDto buildDetail(BookClub club, Long currentUserId) {
        Long clubId = club.getId();
        boolean owner = currentUserId != null && club.getOwner().getId().equals(currentUserId);
        String myRole = currentUserId == null
                ? null
                : memberRepository.findByClub_IdAndUser_Id(clubId, currentUserId)
                        .map(member -> member.getRole().name())
                        .orElse(owner ? ClubMember.Role.OWNER.name() : null);
        boolean joined = myRole != null;
        boolean privateClub = Boolean.TRUE.equals(club.getPrivateClub());
        boolean canManage = ClubMember.Role.OWNER.name().equals(myRole)
                || ClubMember.Role.ADMIN.name().equals(myRole);
        boolean pendingRequest = currentUserId != null && joinRequestRepository
                .findFirstByClub_IdAndUser_IdAndStatusOrderByCreatedAtDesc(
                        clubId, currentUserId, ClubJoinRequest.Status.PENDING)
                .isPresent();

        List<ClubDtos.ClubMemberDto> members = joined || !privateClub
                ? sortedMembers(clubId).stream().map(this::toMemberDto).toList()
                : List.of();
        List<ClubDtos.JoinRequestDto> pendingRequests = canManage
                ? joinRequestRepository
                        .findByClub_IdAndStatusOrderByCreatedAtAsc(clubId, ClubJoinRequest.Status.PENDING)
                        .stream()
                        .map(this::toJoinRequestDto)
                        .toList()
                : List.of();

        return ClubDtos.ClubDetailDto.builder()
                .id(clubId)
                .name(club.getName())
                .description(club.getDescription())
                .coverUrl(club.getCoverUrl())
                .ownerId(club.getOwner().getId())
                .ownerName(displayName(club.getOwner()))
                .ownerAvatarUrl(club.getOwner().getAvatarUrl())
                .privateClub(privateClub)
                .memberCount(memberRepository.countByClub_Id(clubId))
                .postCount(postRepository.countByClubId(clubId))
                .joined(joined)
                .owner(owner)
                .pendingRequest(pendingRequest)
                .myRole(myRole)
                .canManage(canManage)
                .createdAt(club.getCreatedAt())
                .members(members)
                .pendingRequests(pendingRequests)
                .build();
    }

    private List<ClubMember> sortedMembers(Long clubId) {
        List<ClubMember> members = new ArrayList<>(memberRepository.findByClub_IdOrderByJoinedAtAsc(clubId));
        members.sort(Comparator
                .comparingInt((ClubMember member) -> roleOrder(member.getRole()))
                .thenComparing(member -> member.getJoinedAt() == null ? LocalDateTime.MIN : member.getJoinedAt()));
        return members;
    }

    private int roleOrder(ClubMember.Role role) {
        if (role == null) return 4;
        return switch (role) {
            case OWNER -> 0;
            case ADMIN -> 1;
            case MODERATOR -> 2;
            case MEMBER -> 3;
        };
    }

    private ClubDtos.ClubMemberDto toMemberDto(ClubMember member) {
        User user = member.getUser();
        return ClubDtos.ClubMemberDto.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .name(displayName(user))
                .avatarUrl(user.getAvatarUrl())
                .role(member.getRole() == null ? ClubMember.Role.MEMBER.name() : member.getRole().name())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    private ClubDtos.JoinRequestDto toJoinRequestDto(ClubJoinRequest request) {
        User user = request.getUser();
        return ClubDtos.JoinRequestDto.builder()
                .id(request.getId())
                .clubId(request.getClub().getId())
                .userId(user.getId())
                .username(user.getUsername())
                .name(displayName(user))
                .avatarUrl(user.getAvatarUrl())
                .message(request.getMessage())
                .status(request.getStatus().name())
                .createdAt(request.getCreatedAt())
                .build();
    }

    private void requireOwner(BookClub club, Long userId) {
        boolean owner = userId != null && club.getOwner() != null && userId.equals(club.getOwner().getId());
        if (owner) {
            return;
        }
        boolean ownerRole = userId != null && memberRepository.findByClub_IdAndUser_Id(club.getId(), userId)
                .map(member -> member.getRole() == ClubMember.Role.OWNER)
                .orElse(false);
        if (!ownerRole) {
            throw ApiException.forbidden("Chỉ chủ nhóm mới có quyền thực hiện thao tác này.");
        }
    }

    private void notifyManagersOfJoinRequest(BookClub club, User requester) {
        String message = displayName(requester)
                + " đã gửi yêu cầu tham gia nhóm \"" + club.getName() + "\".";
        String link = "/clubs/" + club.getId();
        Set<Long> recipientIds = new LinkedHashSet<>();
        if (club.getOwner() != null) {
            recipientIds.add(club.getOwner().getId());
        }
        memberRepository.findByClub_IdOrderByJoinedAtAsc(club.getId()).stream()
                .filter(member -> member.getRole() == ClubMember.Role.OWNER
                        || member.getRole() == ClubMember.Role.ADMIN)
                .forEach(member -> recipientIds.add(member.getUser().getId()));
        recipientIds.remove(requester.getId());
        recipientIds.forEach(userId -> notificationService.createNotification(userId, message, link));
    }

    private String normalizeName(String rawName) {
        String name = rawName == null ? "" : rawName.trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("Tên nhóm không được để trống.");
        }
        if (name.length() > 150) {
            throw ApiException.badRequest("Tên nhóm không được vượt quá 150 ký tự.");
        }
        return name;
    }

    private String displayName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
