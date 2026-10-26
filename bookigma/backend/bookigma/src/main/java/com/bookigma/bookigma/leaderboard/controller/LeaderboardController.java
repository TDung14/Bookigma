package com.bookigma.bookigma.leaderboard.controller;

import com.bookigma.bookigma.leaderboard.dto.LeaderboardDtos;
import com.bookigma.bookigma.leaderboard.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "*")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<LeaderboardDtos.LeaderboardDto> getLeaderboard() {
        return ResponseEntity.ok(leaderboardService.getLeaderboard());
    }
}
