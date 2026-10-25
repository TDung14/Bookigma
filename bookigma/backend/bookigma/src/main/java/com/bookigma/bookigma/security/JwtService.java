package com.bookigma.bookigma.security;

import com.bookigma.bookigma.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    public static final String ISSUER = "bookigma";
    private static final int MIN_SECRET_BYTES = 32;
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey key;
    private final Duration expiration;

    public JwtService(@Value("${app.jwt.secret:}") String configuredSecret,
                      @Value("${app.jwt.expiration-minutes:10080}") long expirationMinutes) {
        if (expirationMinutes <= 0) {
            throw new IllegalStateException("app.jwt.expiration-minutes phải lớn hơn 0.");
        }
        this.expiration = Duration.ofMinutes(expirationMinutes);

        if (configuredSecret == null || configuredSecret.isBlank()) {
            this.key = Jwts.SIG.HS256.key().build();
            log.warn("Chưa cấu hình JWT_SECRET — đang dùng khóa ngẫu nhiên cho phiên chạy này. "
                    + "Token sẽ mất hiệu lực sau khi khởi động lại backend.");
        } else {
            byte[] secretBytes = configuredSecret.getBytes(StandardCharsets.UTF_8);
            if (secretBytes.length < MIN_SECRET_BYTES) {
                throw new IllegalStateException(
                        "JWT_SECRET phải có ít nhất " + MIN_SECRET_BYTES + " byte (khuyến nghị 32+ ký tự ngẫu nhiên).");
            }
            this.key = Keys.hmacShaKeyFor(secretBytes);
        }
    }

    public String generateToken(User user) {
        return generateToken(user.getId(), user.getUsername(), user.getRole().name());
    }

    public String generateToken(Long userId, String username, String role) {
        if (userId == null || role == null) {
            throw new IllegalArgumentException("Không thể tạo token cho người dùng không hợp lệ.");
        }
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiration)))
                .signWith(key)
                .compact();
    }

    public AuthPrincipal parseToken(String token) {
        requireWellFormed(token);

        Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(ISSUER)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Long userId;
        try {
            userId = Long.valueOf(claims.getSubject());
        } catch (RuntimeException ex) {
            throw new JwtException("Token không có chủ thể hợp lệ.");
        }

        return new AuthPrincipal(userId, claims.get("username", String.class), claims.get("role", String.class));
    }

    public long getExpirationSeconds() {
        return expiration.toSeconds();
    }

    // Bộ giải mã Base64 của JJWT bỏ qua ký tự thừa ở cuối chữ ký, nên chuỗi kiểu
    // "<token hợp lệ>x" vẫn qua được kiểm tra. Chặn trước bằng giải mã Base64URL nghiêm ngặt.
    private void requireWellFormed(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtException("Token không hợp lệ.");
        }
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3) {
            throw new JwtException("Token không đúng định dạng.");
        }
        for (String part : parts) {
            if (part.isEmpty()) {
                throw new JwtException("Token không đúng định dạng.");
            }
            try {
                Base64.getUrlDecoder().decode(part);
            } catch (IllegalArgumentException ex) {
                throw new JwtException("Token không đúng định dạng.", ex);
            }
        }
    }
}
