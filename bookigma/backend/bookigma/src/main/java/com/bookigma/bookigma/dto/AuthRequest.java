package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    private String username;

    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;

    private String fullName;

    // Trim trước khi Bean Validation chạy để email dán kèm khoảng trắng vẫn hợp lệ.
    public void setUsername(String username) {
        this.username = username == null ? null : username.trim();
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }
}
