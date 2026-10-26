package com.bookigma.bookigma.club.entity;

import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "club_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClubMember {

    public enum Role {
        OWNER, ADMIN, MODERATOR, MEMBER
    }

    @EmbeddedId
    private ClubMemberId id;

    @MapsId("clubId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private BookClub club;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.MEMBER;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null && club != null && user != null) {
            id = new ClubMemberId(club.getId(), user.getId());
        }
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        }
        if (role == null) {
            role = Role.MEMBER;
        }
    }
}
