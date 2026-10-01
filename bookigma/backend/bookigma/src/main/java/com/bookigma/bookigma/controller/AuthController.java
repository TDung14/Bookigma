package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.ForgotPasswordRequest;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Đăng ký tài khoản
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody AuthRequest request
    ) {
        try {
            UserProfileDto user = userService.register(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(user);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Không thể đăng ký tài khoản lúc này."
                    ));
        }
    }

    /**
     * Đăng nhập
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody AuthRequest request
    ) {
        try {
            UserProfileDto user = userService.login(request);

            return ResponseEntity.ok(user);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Không thể đăng nhập lúc này."
                    ));
        }
    }

    /**
     * Quên mật khẩu
     * POST /api/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        try {
            userService.forgotPassword(request.email());

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Mật khẩu mới đã được gửi tới email của bạn."
                    )
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", ex.getMessage()));

        } catch (RuntimeException ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Không thể gửi email lúc này. Hãy kiểm tra cấu hình SMTP của backend."
                    ));
        }
    }
}