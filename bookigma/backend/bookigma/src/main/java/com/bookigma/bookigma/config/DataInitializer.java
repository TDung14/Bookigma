package com.bookigma.bookigma.config;

import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Locale;

@Configuration
public class DataInitializer {

    private static final String DEFAULT_PASSWORD = "123456";

    @Bean
    CommandLineRunner initUsers(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "admin",
                    "admin@bookigma.vn",
                    "Administrator",
                    User.Role.ADMIN
            );

            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "shop",
                    "shop@bookigma.vn",
                    "Shop Moderator",
                    User.Role.MODERATOR
            );

            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "user",
                    "user@bookigma.vn",
                    "User",
                    User.Role.USER
            );

            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "user1",
                    "user1@bookigma.vn",
                    "User1",
                    User.Role.USER
            );

            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "user2",
                    "user2@bookigma.vn",
                    "User2",
                    User.Role.USER
            );

            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "user3",
                    "user3@bookigma.vn",
                    "User3",
                    User.Role.USER
            );
            ensureDefaultUser(
                    userRepository,
                    passwordEncoder,
                    "user4",
                    "user4@bookigma.vn",
                    "User4",
                    User.Role.USER
            );
        };
    }

    /**
     * Chỉ tạo tài khoản demo khi chưa có. Không đổi username/mật khẩu tài khoản
     * đã tồn tại — nếu làm vậy, mỗi lần khởi động backend sẽ ghi đè mật khẩu
     * người dùng vừa đăng ký (nếu trùng email/username demo).
     */
    private void ensureDefaultUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String username,
            String email,
            String fullName,
            User.Role role
    ) {
        String normalizedUsername = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);

        if (normalizedUsername.isBlank() || normalizedEmail.isBlank()) {
            return;
        }

        if (userRepository.findByUsernameIgnoreCase(normalizedUsername).isPresent()
                || userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            return;
        }

        User user = User.builder()
                .username(normalizedUsername)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName(fullName)
                .role(role)
                .active(true)
                .build();

        userRepository.save(user);
        System.out.println("Created account: " + normalizedUsername + " | role: " + role);
    }
}
