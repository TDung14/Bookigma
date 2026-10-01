package com.bookigma.bookigma.friend.repository;

import com.bookigma.bookigma.friend.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByRequester_IdAndStatus(Long requesterId, FriendRequest.Status status);
    List<FriendRequest> findByReceiver_IdAndStatus(Long receiverId, FriendRequest.Status status);

    @Query("select f from FriendRequest f where f.status = :status and (f.requester.id = :userId or f.receiver.id = :userId)")
    List<FriendRequest> findAllForUserByStatus(@Param("userId") Long userId, @Param("status") FriendRequest.Status status);

    @Query("select f from FriendRequest f where ((f.requester.id = :a and f.receiver.id = :b) or (f.requester.id = :b and f.receiver.id = :a)) and f.status in :statuses order by f.updatedAt desc")
    List<FriendRequest> findPairWithStatuses(@Param("a") Long a, @Param("b") Long b, @Param("statuses") List<FriendRequest.Status> statuses);

    @Query("select f from FriendRequest f where ((f.requester.id = :a and f.receiver.id = :b) or (f.requester.id = :b and f.receiver.id = :a)) order by f.updatedAt desc")
    List<FriendRequest> findPair(@Param("a") Long a, @Param("b") Long b);
}
