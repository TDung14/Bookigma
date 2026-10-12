package com.bookigma.bookigma.friend.repository;

import com.bookigma.bookigma.friend.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {
    List<UserFollow> findByFollower_Id(Long followerId);
    List<UserFollow> findByFollowed_Id(Long followedId);
    Optional<UserFollow> findByFollower_IdAndFollowed_Id(Long followerId, Long followedId);
    long countByFollowed_Id(Long followedId);
    long countByFollower_Id(Long followerId);
}
