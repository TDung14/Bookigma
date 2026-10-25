package com.bookigma.bookigma.service;

import com.bookigma.bookigma.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Xác thực ID token do Google Identity Services trả về cho frontend. */
@Component
public class GoogleTokenVerifier {
    private static final String JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private final String clientId;
    private final NimbusJwtDecoder decoder;

    public GoogleTokenVerifier(@Value("${google.oauth.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.decoder = NimbusJwtDecoder.withJwkSetUri(JWK_SET_URI).build();
    }

    public GoogleUser verify(String credential) {
        if (clientId.isBlank()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Đăng nhập Google chưa được cấu hình trên máy chủ."
            );
        }

        if (credential == null || credential.isBlank()) {
            throw ApiException.unauthorized("Thiếu thông tin xác thực Google.");
        }

        Jwt jwt;
        try {
            jwt = decoder.decode(credential);
        } catch (JwtException | IllegalArgumentException ex) {
            throw ApiException.unauthorized(
                    "Thông tin đăng nhập Google không hợp lệ hoặc đã hết hạn."
            );
        }

        String issuer = jwt.getClaimAsString("iss");
        List<String> audience = jwt.getAudience();
        if (issuer == null || !ISSUERS.contains(issuer)
                || audience == null || !audience.contains(clientId)) {
            throw ApiException.unauthorized("Thông tin đăng nhập Google không hợp lệ.");
        }

        Object verifiedClaim = jwt.getClaim("email_verified");
        boolean emailVerified = Boolean.TRUE.equals(verifiedClaim)
                || "true".equalsIgnoreCase(String.valueOf(verifiedClaim));
        if (!emailVerified) {
            throw ApiException.unauthorized("Email Google chưa được xác thực.");
        }

        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw ApiException.unauthorized("Tài khoản Google không có email.");
        }

        return new GoogleUser(
                jwt.getSubject(),
                email.trim().toLowerCase(Locale.ROOT),
                jwt.getClaimAsString("name")
        );
    }

    public record GoogleUser(String googleId, String email, String name) {
    }
}
