package com.bookigma.bookigma.friend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendUserDto {
    private Long id;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String role;
}
