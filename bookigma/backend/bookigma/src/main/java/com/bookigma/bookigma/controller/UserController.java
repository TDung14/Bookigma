package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.dto.ChangePasswordRequest;
import com.bookigma.bookigma.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

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

    /** Upload avatar từ file máy người dùng. File được lưu trên backend, DB chỉ lưu đường dẫn tương đối. */
    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
            @PathVariable Long id,
            @CurrentUserId Long currentUserId,
            @RequestParam("file") MultipartFile file
    ) {
        if (!id.equals(currentUserId)) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn chỉ có thể đổi ảnh đại diện của chính mình."));
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn ảnh đại diện."));
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ảnh đại diện không được vượt quá 5 MB."));
        }

        String extension;
        String contentType = file.getContentType();
        if ("image/jpeg".equalsIgnoreCase(contentType)) extension = ".jpg";
        else if ("image/png".equalsIgnoreCase(contentType)) extension = ".png";
        else if ("image/webp".equalsIgnoreCase(contentType)) extension = ".webp";
        else if ("image/gif".equalsIgnoreCase(contentType)) extension = ".gif";
        else return ResponseEntity.badRequest().body(Map.of("message", "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF."));

        Path avatarDirectory = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("avatars").normalize();
        String filename = UUID.randomUUID() + extension;
        Path destination = avatarDirectory.resolve(filename).normalize();
        if (!destination.startsWith(avatarDirectory)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên file không hợp lệ."));
        }
        try {
            Files.createDirectories(avatarDirectory);
            file.transferTo(destination);
            return ResponseEntity.ok(userService.updateUserAvatar(id, "/uploads/avatars/" + filename));
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Không thể lưu ảnh đại diện trên máy chủ."));
        } catch (IllegalArgumentException ex) {
            try { Files.deleteIfExists(destination); } catch (IOException ignored) { }
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
