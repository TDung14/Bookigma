package com.bookigma.bookigma.vip.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.vip.dto.VipDtos.AdminActionRequest;
import com.bookigma.bookigma.vip.dto.VipDtos.PurchaseResponse;
import com.bookigma.bookigma.vip.service.VipService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/vip")
@CrossOrigin(origins = "*")
public class VipAdminController {

    private final VipService vipService;

    public VipAdminController(VipService vipService) {
        this.vipService = vipService;
    }

    @GetMapping("/purchases")
    public ResponseEntity<List<PurchaseResponse>> getPurchases(
            @CurrentUserId Long adminId,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(vipService.getAdminPurchases(adminId, status));
    }

    @PatchMapping("/purchases/{purchaseId}/approve")
    public ResponseEntity<PurchaseResponse> approve(
            @CurrentUserId Long adminId,
            @PathVariable Long purchaseId,
            @RequestBody(required = false) AdminActionRequest request
    ) {
        String note = request == null ? null : request.note();
        String reference = request == null ? null : request.reference();
        return ResponseEntity.ok(vipService.approvePurchase(adminId, purchaseId, note, reference));
    }

    @PatchMapping("/purchases/{purchaseId}/reject")
    public ResponseEntity<PurchaseResponse> reject(
            @CurrentUserId Long adminId,
            @PathVariable Long purchaseId,
            @RequestBody(required = false) AdminActionRequest request
    ) {
        String note = request == null ? null : request.note();
        return ResponseEntity.ok(vipService.rejectPurchase(adminId, purchaseId, note));
    }
}
