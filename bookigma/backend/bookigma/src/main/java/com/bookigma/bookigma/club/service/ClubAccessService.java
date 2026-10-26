package com.bookigma.bookigma.club.service;

import com.bookigma.bookigma.club.entity.BookClub;
import com.bookigma.bookigma.club.entity.ClubMember;
import com.bookigma.bookigma.club.repository.BookClubRepository;
import com.bookigma.bookigma.club.repository.ClubMemberRepository;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClubAccessService {
    private final BookClubRepository clubRepository;
    private final ClubMemberRepository memberRepository;
    private final UserRepository userRepository;

    public ClubAccessService(BookClubRepository clubRepository,
                             ClubMemberRepository memberRepository,
                             UserRepository userRepository) {
        this.clubRepository = clubRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public BookClub requireClub(Long clubId) {
        if (clubId == null) {
            throw ApiException.badRequest("Nhóm đọc sách không hợp lệ.");
        }
        return clubRepository.findById(clubId)
                .orElseThrow(() -> ApiException.notFound("Nhóm đọc sách không tồn tại."));
    }

    @Transactional(readOnly = true)
    public User requireUser(Long userId) {
        if (userId == null) {
            throw ApiException.unauthorized("Bạn cần đăng nhập để thực hiện thao tác này.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Phiên đăng nhập không hợp lệ."));
    }

    @Transactional(readOnly = true)
    public boolean isMember(Long clubId, Long userId) {
        return clubId != null && userId != null && memberRepository.existsByClub_IdAndUser_Id(clubId, userId);
    }

    @Transactional(readOnly = true)
    public ClubMember requireMember(Long clubId, Long userId) {
        if (userId == null) {
            throw ApiException.unauthorized("Bạn cần đăng nhập để thực hiện thao tác này.");
        }
        return memberRepository.findByClub_IdAndUser_Id(clubId, userId)
                .orElseThrow(() -> ApiException.forbidden("Bạn cần tham gia nhóm để thực hiện thao tác này."));
    }

    public boolean canManage(BookClub club, Long userId) {
        if (club == null || userId == null) {
            return false;
        }
        if (club.getOwner() != null && userId.equals(club.getOwner().getId())) {
            return true;
        }
        return memberRepository.findByClub_IdAndUser_Id(club.getId(), userId)
                .map(member -> member.getRole() == ClubMember.Role.OWNER
                        || member.getRole() == ClubMember.Role.ADMIN)
                .orElse(false);
    }

    public void requireManager(BookClub club, Long userId) {
        if (!canManage(club, userId)) {
            throw ApiException.forbidden("Chỉ chủ nhóm hoặc quản trị viên nhóm mới có quyền này.");
        }
    }
}
