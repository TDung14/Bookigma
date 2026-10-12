package com.bookigma.bookigma.friend.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.friend.service.UserFollowService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/follows")
@CrossOrigin(origins = "*")
public class UserFollowController {
    private final UserFollowService service;
    public UserFollowController(UserFollowService service) { this.service = service; }

    @GetMapping("/state")
    public ResponseEntity<?> state(@CurrentUserId Long userId) {
        try { return ResponseEntity.ok(service.getState(userId)); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @PostMapping("/toggle")
    public ResponseEntity<?> toggle(@CurrentUserId Long userId, @RequestBody Map<String, Long> body) {
        try { return ResponseEntity.ok(service.toggle(userId, body.get("targetUserId"))); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @GetMapping("/users/{targetUserId}/summary")
    public ResponseEntity<?> summary(@PathVariable Long targetUserId) {
        try { return ResponseEntity.ok(service.getUserSummary(targetUserId)); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }
}
