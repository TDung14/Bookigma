package com.bookigma.bookigma.mission.entity;

import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Trạng thái nhiệm vụ hằng ngày của một tài khoản. Mỗi ngày một dòng; sang ngày mới
 * service tạo dòng mới nên bộ đếm tự đặt lại.
 */
@Entity
@Table(name = "daily_missions",
        uniqueConstraints = @UniqueConstraint(name = "uk_daily_mission_user_date",
                columnNames = {"user_id", "mission_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyMission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mission_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "mission_date", nullable = false)
    private LocalDate missionDate;

    @Column(name = "read_seconds", nullable = false)
    @Builder.Default
    private Integer readSeconds = 0;

    @Column(name = "chapters", nullable = false)
    @Builder.Default
    private Integer chapters = 0;

    @Column(name = "social_count", nullable = false)
    @Builder.Default
    private Integer socialCount = 0;

    @Column(name = "explore_count", nullable = false)
    @Builder.Default
    private Integer exploreCount = 0;

    @Column(name = "explore_book_ids", columnDefinition = "TEXT")
    private String exploreBookIds;

    @Column(name = "read10_claimed", nullable = false)
    @Builder.Default
    private Boolean read10Claimed = false;

    @Column(name = "chapter_claimed", nullable = false)
    @Builder.Default
    private Boolean chapterClaimed = false;

    @Column(name = "social_claimed", nullable = false)
    @Builder.Default
    private Boolean socialClaimed = false;

    @Column(name = "explore_claimed", nullable = false)
    @Builder.Default
    private Boolean exploreClaimed = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (readSeconds == null) readSeconds = 0;
        if (chapters == null) chapters = 0;
        if (socialCount == null) socialCount = 0;
        if (exploreCount == null) exploreCount = 0;
        if (read10Claimed == null) read10Claimed = false;
        if (chapterClaimed == null) chapterClaimed = false;
        if (socialClaimed == null) socialClaimed = false;
        if (exploreClaimed == null) exploreClaimed = false;
    }
}
