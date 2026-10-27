package com.bookigma.bookigma.vip.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.vip.dto.VipPerkDtos.DailyVoucherStatus;
import com.bookigma.bookigma.vip.dto.VipPerkDtos.PerkSummary;
import com.bookigma.bookigma.vip.service.VipPerkService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Quyền lợi VIP đang dùng được và voucher VIP hằng ngày. */
@RestController
@RequestMapping("/api/vip/perks")
public class VipPerkController {
    private final VipPerkService vipPerkService;

    public VipPerkController(VipPerkService vipPerkService) {
        this.vipPerkService = vipPerkService;
    }

    @GetMapping
    public ResponseEntity<PerkSummary> getPerks(@CurrentUserId Long userId) {
        return ResponseEntity.ok(vipPerkService.getPerks(userId));
    }

    @PostMapping("/daily-voucher")
    public ResponseEntity<DailyVoucherStatus> claimDailyVoucher(@CurrentUserId Long userId) {
        return ResponseEntity.ok(vipPerkService.claimDailyVoucher(userId));
    }
}
