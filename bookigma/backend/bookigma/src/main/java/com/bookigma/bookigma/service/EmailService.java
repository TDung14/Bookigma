package com.bookigma.bookigma.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String mailUsername;
    private final boolean logVerificationLinkWhenMailDisabled;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username:}") String mailUsername,
                        @Value("${app.email-verification.log-link-when-mail-disabled:false}")
                        boolean logVerificationLinkWhenMailDisabled) {
        this.mailSender = mailSender;
        this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
        this.logVerificationLinkWhenMailDisabled = logVerificationLinkWhenMailDisabled;
    }

    // false = chưa cấu hình SMTP, link chỉ được ghi vào log (dev).
    public boolean sendVerificationEmail(String to, String username, String verificationLink) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Tài khoản chưa có email hợp lệ.");
        }

        if (mailUsername.isBlank()) {
            if (logVerificationLinkWhenMailDisabled) {
                log.warn("SMTP chưa cấu hình. Link xác thực email của {}: {}", username, verificationLink);
                return false;
            }
            throw new IllegalStateException("Chưa cấu hình MAIL_USERNAME cho SMTP.");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(mailUsername);
            helper.setTo(to.trim());
            helper.setSubject("Bookigma - Xác thực email đăng ký");
            helper.setText(
                    "Xin chào " + username + ",\n\n"
                    + "Cảm ơn bạn đã đăng ký Bookigma.\n"
                    + "Hãy bấm vào link dưới đây để xác thực email và kích hoạt tài khoản:\n\n"
                    + verificationLink + "\n\n"
                    + "Link có hiệu lực trong 24 giờ.\n"
                    + "Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.\n\n"
                    + "Trân trọng,\nBookigma"
            );
            mailSender.send(message);
            return true;
        } catch (MessagingException | MailException ex) {
            throw new IllegalStateException(
                    "Không thể gửi email xác thực. Kiểm tra MAIL_USERNAME/MAIL_PASSWORD và Gmail App Password.",
                    ex
            );
        }
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

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(mailUsername);
            helper.setTo(to.trim());
            helper.setSubject("Bookigma - Mật khẩu mới");
            helper.setText(
                    "Xin chào " + username + ",\n\n"
                    + "Bookigma đã tạo mật khẩu mới cho tài khoản của bạn.\n\n"
                    + "Tên đăng nhập: " + username + "\n"
                    + "Mật khẩu mới: " + newPassword + "\n\n"
                    + "Hãy đăng nhập và đổi mật khẩu ngay sau khi đăng nhập.\n\n"
                    + "Trân trọng,\nBookigma"
            );
            mailSender.send(message);
        } catch (MessagingException | MailException ex) {
            throw new IllegalStateException(
                    "Không thể gửi email. Kiểm tra MAIL_USERNAME/MAIL_PASSWORD và Gmail App Password.",
                    ex
            );
        }
    }
}
