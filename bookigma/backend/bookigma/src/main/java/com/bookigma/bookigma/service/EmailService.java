package com.bookigma.bookigma.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String mailUsername;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username:}") String mailUsername) {
        this.mailSender = mailSender;
        this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
    }

    public void sendNewPassword(String to, String username, String newPassword) {
        if (mailUsername.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình MAIL_USERNAME cho SMTP."
            );
        }

        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Tài khoản chưa có email hợp lệ.");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailUsername);
        message.setTo(to);
        message.setSubject("Bookigma - Mật khẩu mới");
        message.setText(
                "Xin chào " + username + ",\n\n"
                + "Bookigma đã tạo mật khẩu mới cho tài khoản của bạn.\n\n"
                + "Tên đăng nhập: " + username + "\n"
                + "Mật khẩu mới: " + newPassword + "\n\n"
                + "Hãy đăng nhập và đổi mật khẩu ngay sau khi đăng nhập.\n\n"
                + "Trân trọng,\nBookigma"
        );

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            throw new IllegalStateException(
                    "Không thể gửi email. Kiểm tra MAIL_USERNAME/MAIL_PASSWORD và Gmail App Password.",
                    ex
            );
        }
    }
}
