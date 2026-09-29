package com.bookigma.bookigma.config;

import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initUsers(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            createUser(
                    userRepository,
                    passwordEncoder,
                    "user",
                    "user@bookigma.com",
                    "User",
                    User.Role.USER
            );

            createUser(
                    userRepository,
                    passwordEncoder,
                    "shop",
                    "shop@bookigma.com",
                    "Shop Moderator",
                    User.Role.MODERATOR
            );

            createUser(
                    userRepository,
                    passwordEncoder,
                    "admin",
                    "admin@bookigma.com",
                    "Administrator",
                    User.Role.ADMIN
            );
        };
    }

    private void createUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String username,
            String email,
            String fullName,
            User.Role role
    ) {

        if (userRepository.existsByUsername(username)) {
            return;
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(
                        passwordEncoder.encode("123456")
                )
                .fullName(fullName)
                .role(role)
                .active(true)
                .build();

        userRepository.save(user);

        System.out.println(
                "Created account: "
                        + username
                        + " | role: "
                        + role
        );
    }
}