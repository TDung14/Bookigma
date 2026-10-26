package com.bookigma.bookigma.club.entity;

import com.bookigma.bookigma.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "book_clubs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookClub {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "club_id")
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_url", length = 255)
    private String coverUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "is_private", nullable = false)
    @Builder.Default
    private Boolean privateClub = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        }
        if (privateClub == null) {
            privateClub = false;
        }
    }
}
