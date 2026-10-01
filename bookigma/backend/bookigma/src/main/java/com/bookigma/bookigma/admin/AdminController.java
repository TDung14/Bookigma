package com.bookigma.bookigma.admin.controller;

import com.bookigma.bookigma.admin.dto.AdminUserRequest;
import com.bookigma.bookigma.admin.dto.AdminUserResponse;
import com.bookigma.bookigma.admin.dto.AdminUserUpdateRequest;
import com.bookigma.bookigma.admin.service.AdminService;
import com.bookigma.bookigma.config.CurrentUserId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import com.bookigma.bookigma.report.dto.ResolveReportRequest;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(@CurrentUserId Long adminId) {
        return handle(() -> adminService.getUsers(adminId));
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(
            @CurrentUserId Long adminId,
            @RequestBody AdminUserRequest request
    ) {
        return handle(() -> ResponseEntity.status(201).body(adminService.createUser(adminId, request)));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(
            @CurrentUserId Long adminId,
            @PathVariable Long userId,
            @RequestBody AdminUserUpdateRequest request
    ) {
        return handle(() -> adminService.updateUser(adminId, userId, request));
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(
            @CurrentUserId Long adminId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body
    ) {
        return handle(() -> adminService.updateUserRole(
                adminId,
                userId,
                body == null ? null : body.get("role")
        ));
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(
            @CurrentUserId Long adminId,
            @PathVariable Long userId,
            @RequestBody Map<String, Boolean> body
    ) {
        boolean active = body != null && Boolean.TRUE.equals(body.get("active"));
        return handle(() -> adminService.updateUserStatus(adminId, userId, active));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(
            @CurrentUserId Long adminId,
            @PathVariable Long userId
    ) {
        return handle(() -> {
            adminService.deleteUser(adminId, userId);
            return Map.of("message", "Đã xóa tài khoản.");
        });
    }

    @GetMapping("/posts")
    public ResponseEntity<?> getPosts(@CurrentUserId Long adminId) {
        return handle(() -> adminService.getPosts(adminId));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(
            @CurrentUserId Long adminId,
            @PathVariable Long postId
    ) {
        return handle(() -> {
            adminService.deletePost(adminId, postId);
            return Map.of("message", "Đã xóa bài đăng và dữ liệu liên quan.");
        });
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<?> getComments(
            @CurrentUserId Long adminId,
            @PathVariable Long postId
    ) {
        return handle(() -> adminService.getComments(adminId, postId));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(@CurrentUserId Long adminId) {
        return handle(() -> adminService.getReports(adminId));
    }

    @PatchMapping("/reports/{reportId}")
    public ResponseEntity<?> resolveReport(@CurrentUserId Long adminId, @PathVariable Long reportId, @RequestBody ResolveReportRequest request) {
        return handle(() -> adminService.resolveReport(adminId, reportId, request));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @CurrentUserId Long adminId,
            @PathVariable Long commentId
    ) {
        return handle(() -> {
            adminService.deleteComment(adminId, commentId);
            return Map.of("message", "Đã xóa bình luận.");
        });
    }

    private ResponseEntity<?> handle(SupplierWithResponse action) {
        try {
            Object result = action.get();
            if (result instanceof ResponseEntity<?> responseEntity) {
                return responseEntity;
            }
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException ex) {
            String message = ex.getMessage() == null ? "Yêu cầu không hợp lệ." : ex.getMessage();
            int status = message.contains("quyền") || message.contains("đăng nhập")
                    || message.contains("quản trị") ? 403 : 400;
            return ResponseEntity.status(status).body(Map.of("message", message));
        }
    }

    @FunctionalInterface
    private interface SupplierWithResponse {
        Object get();
    }
}
