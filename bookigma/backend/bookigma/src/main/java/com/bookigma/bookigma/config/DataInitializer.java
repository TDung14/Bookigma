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
                    "user",
                    "user@bookigma.vn",
                    "User",
                    User.Role.USER
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
                    "admin",
                    "admin@bookigma.vn",
                    "Administrator",
                    User.Role.ADMIN
            );
        };
    }

    private void ensureDefaultUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String username,
            String email,
            String fullName,
            User.Role role
    ) {
        String normalizedUsername = username == null ? "" : username.trim();
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);

        if (normalizedUsername.isBlank() || normalizedEmail.isBlank()) {
            return;
        }

        User user = userRepository.findByUsername(normalizedUsername)
                .orElseGet(() -> userRepository.findByEmail(normalizedEmail)
                        .orElse(null));

        if (user == null) {
            user = User.builder()
                    .username(normalizedUsername)
                    .email(normalizedEmail)
                    .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                    .fullName(fullName)
                    .role(role)
                    .active(true)
                    .build();

            userRepository.save(user);
            System.out.println("Created account: " + normalizedUsername + " | role: " + role);
            return;
        }

        boolean changed = false;

        if (!normalizedEmail.equalsIgnoreCase(user.getEmail())) {
            if (!userRepository.existsByEmail(normalizedEmail) || normalizedEmail.equalsIgnoreCase(user.getEmail())) {
                user.setEmail(normalizedEmail);
                changed = true;
            }
        }

        if (user.getUsername() == null || !user.getUsername().equals(normalizedUsername)) {
            user.setUsername(normalizedUsername);
            changed = true;
        }

        if (user.getFullName() == null || !user.getFullName().equals(fullName)) {
            user.setFullName(fullName);
            changed = true;
        }

        if (user.getRole() != role) {
            user.setRole(role);
            changed = true;
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            user.setActive(true);
            changed = true;
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(DEFAULT_PASSWORD, user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }
    }
}