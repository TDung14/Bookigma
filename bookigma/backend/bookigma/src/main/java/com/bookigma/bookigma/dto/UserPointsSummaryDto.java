package com.bookigma.bookigma.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPointsSummaryDto {
    private Long userId;
    private Integer balance;
    private Integer lifetimePoints;
    private String currentTier;
    private String nextTier;
    private Integer pointsToNextTier;
    private Boolean checkedInToday;
    private List<PointTransactionDto> recentTransactions;
}
