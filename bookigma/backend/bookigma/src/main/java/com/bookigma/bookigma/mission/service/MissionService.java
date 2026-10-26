package com.bookigma.bookigma.mission.service;

import com.bookigma.bookigma.mission.dto.MissionDtos;

public interface MissionService {
    MissionDtos.DailyMissionDto getToday(Long userId);

    MissionDtos.DailyMissionDto recordReading(Long userId, int seconds);

    MissionDtos.DailyMissionDto recordChapter(Long userId);

    MissionDtos.DailyMissionDto recordSocial(Long userId);

    MissionDtos.DailyMissionDto recordExplore(Long userId, Long bookId);

    MissionDtos.ClaimResponse claim(Long userId, String taskId);
}
