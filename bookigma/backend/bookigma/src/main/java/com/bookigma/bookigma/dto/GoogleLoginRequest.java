package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank(message = "Thiếu thông tin xác thực Google.")
        @Size(max = 4096, message = "Thông tin xác thực Google không hợp lệ.")
        String credential
) {
    public GoogleLoginRequest {
        credential = credential == null ? null : credential.trim();
    }
}
