package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @NotBlank(message = "Thiếu mã xác thực.")
        @Size(max = 200, message = "Mã xác thực không hợp lệ.")
        String token
) {
    public VerifyEmailRequest {
        token = token == null ? null : token.trim();
    }
}
