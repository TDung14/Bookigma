package com.bookigma.bookigma.mission.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class MissionDtos {
    private MissionDtos() {
    }

    @Data
    @Builder
    public static class DailyMissionDto {
        private LocalDate date;
        private Map<String, Integer> counters;
        private List<String> claimed;
        private List<TaskDto> tasks;
    }

    @Data
    @Builder
    public static class TaskDto {
        private String id;
        private String label;
        private String hint;
        private String metric;
        private Integer goal;
        private Integer reward;
        private Integer progress;
        private Integer percent;
        private Boolean done;
        private Boolean claimed;
    }

    @Data
    @Builder
    public static class ClaimResponse {
        private Integer amount;
        private Integer balanceAfter;
        private DailyMissionDto missions;
    }

    @Data
    public static class ExploreRequest {
        private Long bookId;
    }
}
