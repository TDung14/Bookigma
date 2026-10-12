package com.bookigma.bookigma.friend.service;

import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.friend.entity.UserFollow;
import com.bookigma.bookigma.friend.repository.UserFollowRepository;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class UserFollowService {
    private final UserFollowRepository followRepository;
    private final UserRepository userRepository;

    public UserFollowService(UserFollowRepository followRepository, UserRepository userRepository) {
        this.followRepository = followRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getState(Long currentUserId) {
        requireUser(currentUserId);
        List<Long> followingIds = followRepository.findByFollower_Id(currentUserId).stream()
                .map(f -> f.getFollowed().getId()).distinct().toList();
        List<Long> followerIds = followRepository.findByFollowed_Id(currentUserId).stream()
                .map(f -> f.getFollower().getId()).distinct().toList();
        return Map.of("followingIds", followingIds, "followerIds", followerIds,
                "followingCount", followingIds.size(), "followerCount", followerIds.size());
    }

    @Transactional
    public Map<String, Object> toggle(Long currentUserId, Long targetUserId) {
        if (targetUserId == null) throw new IllegalArgumentException("Thiếu người dùng cần theo dõi.");
        if (Objects.equals(currentUserId, targetUserId)) throw new IllegalArgumentException("Bạn không thể tự theo dõi chính mình.");
        User follower = requireUser(currentUserId);
        User followed = requireUser(targetUserId);
        Optional<UserFollow> existing = followRepository.findByFollower_IdAndFollowed_Id(currentUserId, targetUserId);
        boolean following;
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            following = false;
        } else {
            followRepository.save(UserFollow.builder().follower(follower).followed(followed).build());
            following = true;
        }
        Map<String, Object> state = new HashMap<>(getState(currentUserId));
        state.put("following", following);
        state.put("targetUserId", targetUserId);
        state.put("targetFollowerCount", followRepository.countByFollowed_Id(targetUserId));
        return state;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserSummary(Long targetUserId) {
        requireUser(targetUserId);
        return Map.of("userId", targetUserId,
                "followerCount", followRepository.countByFollowed_Id(targetUserId),
                "followingCount", followRepository.countByFollower_Id(targetUserId));
    }

    private User requireUser(Long id) {
        if (id == null) throw new IllegalArgumentException("Bạn cần đăng nhập.");
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại."));
    }
}
