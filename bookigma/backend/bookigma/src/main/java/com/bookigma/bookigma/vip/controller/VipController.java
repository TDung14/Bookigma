package com.bookigma.bookigma.vip.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.vip.dto.VipDtos.CreatePurchaseRequest;
import com.bookigma.bookigma.vip.dto.VipDtos.PurchaseResponse;
import com.bookigma.bookigma.vip.dto.VipDtos.SubscriptionResponse;
import com.bookigma.bookigma.vip.service.VipPlan;
import com.bookigma.bookigma.vip.service.VipService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vip")
@CrossOrigin(origins = "*")
public class VipController {

    private final VipService vipService;

    public VipController(VipService vipService) {
        this.vipService = vipService;
    }

    @GetMapping("/plans")
    public ResponseEntity<List<VipPlan>> getPlans() {
        return ResponseEntity.ok(VipPlan.all());
    }

    @GetMapping("/me")
    public ResponseEntity<SubscriptionResponse> getMyVip(@CurrentUserId Long userId) {
        return ResponseEntity.ok(vipService.getMyVip(userId));
    }

    @PostMapping("/purchases")
    public ResponseEntity<PurchaseResponse> createPurchase(
            @CurrentUserId Long userId,
            @RequestBody(required = false) CreatePurchaseRequest request
    ) {
        String planId = request == null ? null : request.planId();
        return ResponseEntity.ok(vipService.createPurchase(userId, planId));
    }

    @GetMapping("/purchases/{purchaseId}")
    public ResponseEntity<PurchaseResponse> getPurchase(
            @CurrentUserId Long userId,
            @PathVariable Long purchaseId
    ) {
        return ResponseEntity.ok(vipService.getMyPurchase(userId, purchaseId));
    }
}
