package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.dto.UserPointsSummaryDto;
import com.bookigma.bookigma.service.PointService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/points")
@CrossOrigin(origins = "*")
public class PointController {

    private final PointService pointService;

    public PointController(PointService pointService) {
        this.pointService = pointService;
    }

    @GetMapping("/summary")
    public ResponseEntity<UserPointsSummaryDto> getSummary(@CurrentUserId Long userId) {
        return ResponseEntity.ok(pointService.getPointsSummary(userId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<PointTransactionDto>> getHistory(@CurrentUserId Long userId) {
        return ResponseEntity.ok(pointService.getPointsHistory(userId));
    }

    @PostMapping("/check-in")
    public ResponseEntity<PointTransactionDto> dailyCheckIn(@CurrentUserId Long userId) {
        return ResponseEntity.ok(pointService.dailyCheckIn(userId));
    }

    public static class PointReq {
        public Integer amount;
        public String type;
        public String description;
    }

    @PostMapping("/add")
    public ResponseEntity<PointTransactionDto> addPoints(@CurrentUserId Long userId, @RequestBody PointReq req) {
        int amount = (req != null && req.amount != null) ? req.amount : 0;
        String type = (req != null && req.type != null) ? req.type : "EARN_POINTS";
        String desc = (req != null && req.description != null) ? req.description : "Thưởng điểm";
        return ResponseEntity.ok(pointService.addPoints(userId, amount, type, null, desc));
    }

    @PostMapping("/deduct")
    public ResponseEntity<PointTransactionDto> deductPoints(@CurrentUserId Long userId, @RequestBody PointReq req) {
        int amount = (req != null && req.amount != null) ? req.amount : 0;
        String type = (req != null && req.type != null) ? req.type : "DEDUCT_POINTS";
        String desc = (req != null && req.description != null) ? req.description : "Trừ điểm";
        return ResponseEntity.ok(pointService.deductPoints(userId, amount, type, null, desc));
    }
}
