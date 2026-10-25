package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResendVerificationRequest(
        @NotBlank(message = "Email không được để trống.")
        @Email(message = "Email không hợp lệ.")
        String email
) {
    public ResendVerificationRequest {
        email = email == null ? null : email.trim();
    }
}
