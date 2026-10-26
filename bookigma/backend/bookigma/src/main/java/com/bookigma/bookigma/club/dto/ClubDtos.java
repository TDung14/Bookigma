package com.bookigma.bookigma.club.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

public final class ClubDtos {
    private ClubDtos() {
    }

    @Data
    @Builder
    public static class ClubSummaryDto {
        private Long id;
        private String name;
        private String description;
        private String coverUrl;
        private Long ownerId;
        private String ownerName;
        private String ownerAvatarUrl;
        private boolean privateClub;
        private long memberCount;
        private long postCount;
        private boolean joined;
        private boolean owner;
        private boolean pendingRequest;
        private long pendingRequestCount;
        private String myRole;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class ClubDetailDto {
        private Long id;
        private String name;
        private String description;
        private String coverUrl;
        private Long ownerId;
        private String ownerName;
        private String ownerAvatarUrl;
        private boolean privateClub;
        private long memberCount;
        private long postCount;
        private boolean joined;
        private boolean owner;
        private boolean pendingRequest;
        private String myRole;
        private boolean canManage;
        private LocalDateTime createdAt;
        private List<ClubMemberDto> members;
        private List<JoinRequestDto> pendingRequests;
    }

    @Data
    @Builder
    public static class ClubMemberDto {
        private Long userId;
        private String username;
        private String name;
        private String avatarUrl;
        private String role;
        private LocalDateTime joinedAt;
    }

    @Data
    @Builder
    public static class JoinRequestDto {
        private Long id;
        private Long clubId;
        private Long userId;
        private String username;
        private String name;
        private String avatarUrl;
        private String message;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    public static class CreateClubRequest {
        @NotBlank(message = "Tên nhóm không được để trống.")
        @Size(max = 150, message = "Tên nhóm không được vượt quá 150 ký tự.")
        private String name;

        @Size(max = 2000, message = "Mô tả nhóm không được vượt quá 2000 ký tự.")
        private String description;

        @Size(max = 255, message = "Ảnh bìa không được vượt quá 255 ký tự.")
        private String coverUrl;

        private Boolean privateClub;
    }

    @Data
    public static class UpdateClubRequest {
        @Size(max = 150, message = "Tên nhóm không được vượt quá 150 ký tự.")
        private String name;

        @Size(max = 2000, message = "Mô tả nhóm không được vượt quá 2000 ký tự.")
        private String description;

        @Size(max = 255, message = "Ảnh bìa không được vượt quá 255 ký tự.")
        private String coverUrl;

        private Boolean privateClub;
    }

    @Data
    public static class JoinClubRequest {
        @Size(max = 500, message = "Lời nhắn không được vượt quá 500 ký tự.")
        private String message;
    }

    @Data
    public static class UpdateMemberRoleRequest {
        @NotBlank(message = "Vai trò không được để trống.")
        private String role;
    }
}
