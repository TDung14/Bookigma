package com.bookigma.bookigma.progress.dto;

import com.bookigma.bookigma.mission.dto.MissionDtos;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public final class ProgressDtos {
    private ProgressDtos() {
    }

    @Data
    @Builder
    public static class ReadingProgressDto {
        private Long bookId;
        private Integer chapterIndex;
        private Integer paragraphIndex;
        private Integer percent;
        private Integer secondsRead;
        private Boolean finished;
        private LocalDateTime lastReadAt;
    }

    @Data
    public static class UpdateRequest {
        private Integer chapterIndex;
        private Integer paragraphIndex;
        private Integer percent;
        /** Số giây đọc thực tế kể từ lần đồng bộ trước; server giới hạn tối đa 300 giây mỗi lần. */
        private Integer secondsDelta;
        private Boolean finished;
    }

    @Data
    @Builder
    public static class UpdateResponse {
        private ReadingProgressDto progress;
        private Integer streak;
        private Boolean streakAdvanced;
        private Integer pointsAwarded;
        private Integer balanceAfter;
        private MissionDtos.DailyMissionDto missions;
    }

    @Data
    @Builder
    public static class ChapterCompleteResponse {
        private Boolean firstTime;
        private Integer pointsAwarded;
        private Integer balanceAfter;
        private MissionDtos.DailyMissionDto missions;
    }
}
