package com.bookigma.bookigma.friend.dto;

import com.bookigma.bookigma.friend.entity.FriendRequest;

import java.time.LocalDateTime;
import java.util.List;

public final class FriendDtos {
    private FriendDtos() {}

    public record FriendRequestResponse(
            Long id,
            Long requesterId,
            Long receiverId,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        public static FriendRequestResponse from(FriendRequest r) {
            return new FriendRequestResponse(
                    r.getId(),
                    r.getRequester().getId(),
                    r.getReceiver().getId(),
                    r.getStatus().name(),
                    r.getCreatedAt(),
                    r.getUpdatedAt()
            );
        }
    }

    public record FriendStateResponse(
            Long userId,
            List<Long> friendIds,
            List<Long> sentPendingIds,
            List<Long> receivedPendingIds) {}
}