package com.bookigma.bookigma.security;

/** Danh tính người dùng đã xác thực bằng JWT, gắn vào SecurityContext của mỗi request. */
public record AuthPrincipal(Long userId, String username, String role) {
}
