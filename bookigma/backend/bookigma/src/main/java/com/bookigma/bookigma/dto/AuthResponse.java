package com.bookigma.bookigma.dto;

/** Kết quả đăng nhập: Bearer token kèm hồ sơ người dùng để frontend lưu phiên. */
public record AuthResponse(
        String token,
        String tokenType,
        long expiresInSeconds,
        UserProfileDto user
) {
    public static AuthResponse of(String token, long expiresInSeconds, UserProfileDto user) {
        return new AuthResponse(token, "Bearer", expiresInSeconds, user);
    }
}
