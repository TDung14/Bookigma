package com.bookigma.bookigma.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ClubMemberId implements Serializable {

    @Column(name = "club_id")
    private Long clubId;

    @Column(name = "user_id")
    private Long userId;
}
