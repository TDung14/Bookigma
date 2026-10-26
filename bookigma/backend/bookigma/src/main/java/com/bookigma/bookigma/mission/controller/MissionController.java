package com.bookigma.bookigma.mission.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.mission.dto.MissionDtos;
import com.bookigma.bookigma.mission.service.MissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
@CrossOrigin(origins = "*")
public class MissionController {

    private final MissionService missionService;

    public MissionController(MissionService missionService) {
        this.missionService = missionService;
    }

    @GetMapping("/today")
    public ResponseEntity<MissionDtos.DailyMissionDto> today(@CurrentUserId Long userId) {
        return ResponseEntity.ok(missionService.getToday(userId));
    }

    @PostMapping("/{taskId}/claim")
    public ResponseEntity<MissionDtos.ClaimResponse> claim(@CurrentUserId Long userId,
                                                           @PathVariable String taskId) {
        return ResponseEntity.ok(missionService.claim(userId, taskId));
    }

    @PostMapping("/explore")
    public ResponseEntity<MissionDtos.DailyMissionDto> explore(@CurrentUserId Long userId,
                                                               @RequestBody(required = false) MissionDtos.ExploreRequest request) {
        Long bookId = request == null ? null : request.getBookId();
        return ResponseEntity.ok(missionService.recordExplore(userId, bookId));
    }
}
