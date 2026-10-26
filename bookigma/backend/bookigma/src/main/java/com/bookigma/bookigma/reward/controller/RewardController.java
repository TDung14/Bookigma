package com.bookigma.bookigma.reward.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.reward.dto.RewardDtos;
import com.bookigma.bookigma.reward.service.RewardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rewards")
@CrossOrigin(origins = "*")
public class RewardController {

    private final RewardService rewardService;

    public RewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<RewardDtos.RewardDto>> catalog() {
        return ResponseEntity.ok(rewardService.getCatalog());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<RewardDtos.RedemptionDto>> mine(@CurrentUserId Long userId) {
        return ResponseEntity.ok(rewardService.getRedemptions(userId));
    }

    @GetMapping("/vouchers")
    public ResponseEntity<List<RewardDtos.UserVoucherDto>> vouchers(@CurrentUserId Long userId) {
        return ResponseEntity.ok(rewardService.getAvailableVouchers(userId));
    }

    @PostMapping("/{rewardId}/redeem")
    public ResponseEntity<RewardDtos.RedeemResponse> redeem(@CurrentUserId Long userId,
                                                            @PathVariable String rewardId) {
        return ResponseEntity.ok(rewardService.redeem(userId, rewardId));
    }
}
