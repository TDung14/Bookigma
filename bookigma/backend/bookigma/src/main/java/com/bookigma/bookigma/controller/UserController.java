package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.dto.ChangePasswordRequest;
import com.bookigma.bookigma.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserProfileDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getProfile(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.getUserProfile(id));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long id,
            @CurrentUserId Long currentUserId,
            @RequestBody UserProfileDto dto
    ) {
        try {
            if (!id.equals(currentUserId)) return ResponseEntity.status(403).body(Map.of("message", "Bạn chỉ có thể sửa hồ sơ của chính mình."));
            return ResponseEntity.ok(userService.updateUserProfile(currentUserId, dto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(
            @PathVariable Long id,
            @CurrentUserId Long currentUserId,
            @RequestBody ChangePasswordRequest request) {
        try {
            if (!id.equals(currentUserId)) return ResponseEntity.status(403).body(Map.of("message", "Bạn chỉ có thể đổi mật khẩu của chính mình."));
            userService.changePassword(currentUserId, request);
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

}
