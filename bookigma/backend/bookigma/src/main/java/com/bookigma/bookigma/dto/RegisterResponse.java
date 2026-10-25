package com.bookigma.bookigma.dto;

public record RegisterResponse(
        String message,
        String email,
        boolean emailSent
) {
}
