package com.bookigma.bookigma.friend.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.friend.dto.FriendStateDto;
import com.bookigma.bookigma.friend.service.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = "*")
public class FriendController {
    private final FriendService service;
    public FriendController(FriendService service) { this.service = service; }

    @GetMapping("/state")
    public ResponseEntity<?> state(@CurrentUserId Long userId) { return ResponseEntity.ok(service.getState(userId)); }

    @PostMapping("/request")
    public ResponseEntity<?> request(@CurrentUserId Long userId, @RequestBody Map<String, Long> body) {
        try { return ResponseEntity.ok(service.sendRequest(userId, body.get("receiverId"))); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @PostMapping("/accept")
    public ResponseEntity<?> accept(@CurrentUserId Long userId, @RequestBody Map<String, Long> body) {
        try { return ResponseEntity.ok(service.accept(userId, body.get("requesterId"))); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @PostMapping("/reject")
    public ResponseEntity<?> reject(@CurrentUserId Long userId, @RequestBody Map<String, Long> body) {
        try { return ResponseEntity.ok(service.reject(userId, body.get("requesterId"))); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(@CurrentUserId Long userId, @RequestBody Map<String, Long> body) {
        try { return ResponseEntity.ok(service.cancel(userId, body.get("otherUserId"))); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }
}
