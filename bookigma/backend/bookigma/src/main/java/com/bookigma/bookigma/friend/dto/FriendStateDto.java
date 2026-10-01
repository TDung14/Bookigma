package com.bookigma.bookigma.friend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FriendStateDto {
    private List<Long> friendIds;
    private List<Long> sentPendingIds;
    private List<Long> receivedPendingIds;
    private List<FriendUserDto> friends;
    private List<FriendUserDto> sentPendingUsers;
    private List<FriendUserDto> receivedPendingUsers;
}
