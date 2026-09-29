package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public UserProfileDto register(AuthRequest request) {
        String username = request.getUsername().trim();
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống!");
        }
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email này đã được đăng ký!");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(normalize(request.getFullName()))
                .role(User.Role.USER)
                .active(true)
                .build();

        return toDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserProfileDto login(AuthRequest request) {
        String username = request.getUsername().trim();
        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username.toLowerCase()))
                .orElseThrow(() -> new IllegalArgumentException("Sai tên đăng nhập/email hoặc mật khẩu!"));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new IllegalArgumentException("Tài khoản đã bị khóa hoặc vô hiệu hóa!");
        }

        boolean valid = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        if (!valid) {
            throw new IllegalArgumentException("Sai tên đăng nhập hoặc mật khẩu!");
        }

        return toDto(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileDto getUserProfile(Long userId) {
        return toDto(findUser(userId));
    }

    @Override
    @Transactional
    public UserProfileDto updateUserProfile(Long userId, UserProfileDto dto) {
        User user = findUser(userId);

        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            String newEmail = dto.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new IllegalArgumentException("Email này đã được tài khoản khác sử dụng!");
            }
            user.setEmail(newEmail);
        }

        if (dto.getFullName() != null) {
            user.setFullName(normalize(dto.getFullName()));
        }
        if (dto.getBio() != null) {
            user.setBio(dto.getBio().trim());
        }
        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl().trim());
        }

        return toDto(userRepository.save(user));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng!"));
    }

    private String normalize(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isBlank() ? null : result;
    }

    private UserProfileDto toDto(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() == null ? "user" : user.getRole().name().toLowerCase())
                .active(user.getActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
