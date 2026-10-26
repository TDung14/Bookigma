package com.bookigma.bookigma.leaderboard.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

public final class LeaderboardDtos {
    private LeaderboardDtos() {
    }

    @Data
    @Builder
    public static class LeaderboardDto {
        private List<ReaderEntry> readers;
        private List<BuyerEntry> buyers;
    }

    @Data
    @Builder
    public static class ReaderEntry {
        private Long userId;
        private String name;
        private String username;
        private String avatarUrl;
        private Integer booksStarted;
        private Integer booksFinished;
        private Integer secondsRead;
        private Integer points;
        private Integer streak;
    }

    @Data
    @Builder
    public static class BuyerEntry {
        private Long userId;
        private String name;
        private String username;
        private String avatarUrl;
        private Integer orderCount;
        private BigDecimal totalSpent;
        private Integer points;
    }
}
