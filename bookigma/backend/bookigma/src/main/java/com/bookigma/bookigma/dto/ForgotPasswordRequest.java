package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Email không được để trống.")
        @Email(message = "Email không hợp lệ.")
        String email
) {
    public ForgotPasswordRequest {
        email = email == null ? null : email.trim();
    }
}
