package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.AuthResponse;
import com.bookigma.bookigma.dto.ForgotPasswordRequest;
import com.bookigma.bookigma.dto.GoogleLoginRequest;
import com.bookigma.bookigma.dto.RegisterResponse;
import com.bookigma.bookigma.dto.ResendVerificationRequest;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.dto.VerifyEmailRequest;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.security.JwtService;
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
    private final JwtService jwtService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    private AuthResponse authResponse(UserProfileDto user) {
        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.getRole());
        return AuthResponse.of(token, jwtService.getExpirationSeconds(), user);
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
            RegisterResponse response = userService.register(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", ex.getMessage()));

        } catch (IllegalStateException ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
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

            return ResponseEntity.ok(authResponse(user));

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
     * Hồ sơ người dùng đang đăng nhập — frontend dùng để khôi phục phiên từ token.
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> me(@CurrentUserId Long userId) {
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    /**
     * Xác thực email bằng token trong link
     * POST /api/auth/verify-email
     */
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request
    ) {
        try {
            UserProfileDto user = userService.verifyEmail(request.token());
            return ResponseEntity.ok(authResponse(user));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Không thể xác thực email lúc này."
                    ));
        }
    }

    /**
     * Gửi lại email xác thực
     * POST /api/auth/resend-verification
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request
    ) {
        try {
            userService.resendVerificationEmail(request.email());

            return ResponseEntity.ok(
                    Map.of("message", "Email xác thực đã được gửi lại.")
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", ex.getMessage()));

        } catch (IllegalStateException ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Không thể gửi email xác thực lúc này."
                    ));
        }
    }

    /**
     * Đăng nhập bằng Google
     * POST /api/auth/google
     */
    @PostMapping("/google")
    public ResponseEntity<?> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    authResponse(userService.loginWithGoogle(request.credential()))
            );

        } catch (ApiException ex) {
            return ResponseEntity
                    .status(ex.getStatus())
                    .body(Map.of("message", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Không thể đăng nhập bằng Google lúc này."
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