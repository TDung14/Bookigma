
package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Đăng ký tài khoản
    @Override
    @Transactional
    public UserProfileDto register(AuthRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu đăng ký không hợp lệ!");
        }

        String username = request.getUsername() == null ? "" : request.getUsername().trim().toLowerCase();
        if (username.isBlank()) {
            throw new IllegalArgumentException("Tên đăng nhập không được để trống!");
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống!");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Mật khẩu không được để trống!");
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

        User savedUser = userRepository.save(user);

        return toDto(savedUser);
    }

    @Override
    @Transactional
    public UserProfileDto login(AuthRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu đăng nhập không hợp lệ!");
        }

        String username = request.getUsername() == null ? "" : request.getUsername().trim().toLowerCase();
        if (username.isBlank()) {
            throw new IllegalArgumentException("Tên đăng nhập không được để trống!");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Mật khẩu không được để trống!");
        }

        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Sai tên đăng nhập/email hoặc mật khẩu!"
                        )
                );

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new IllegalArgumentException(
                    "Tài khoản đã bị khóa hoặc vô hiệu hóa!"
            );
        }

        boolean valid = passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash()
        );

        if (!valid) {
            throw new IllegalArgumentException(
                    "Sai tên đăng nhập hoặc mật khẩu!"
            );
        }

        return toDto(user);
    }

    // Lấy danh sách người dùng đang hoạt động
    @Override
    @Transactional(readOnly = true)
    public List<UserProfileDto> getAllUsers() {
        return userRepository.findAll().stream()
                .filter(user -> Boolean.TRUE.equals(user.getActive()))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // Lấy thông tin hồ sơ
    @Override
    @Transactional(readOnly = true)
    public UserProfileDto getUserProfile(Long userId) {
        User user = findUser(userId);
        return toDto(user);
    }

    // Cập nhật thông tin hồ sơ
    @Override
    @Transactional
    public UserProfileDto updateUserProfile(
            Long userId,
            UserProfileDto dto
    ) {
        User user = findUser(userId);

        // Cập nhật email
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            String newEmail = dto.getEmail().trim().toLowerCase();

            if (!newEmail.equalsIgnoreCase(user.getEmail())
                    && userRepository.existsByEmail(newEmail)) {
                throw new IllegalArgumentException(
                        "Email này đã được tài khoản khác sử dụng!"
                );
            }

            user.setEmail(newEmail);
        }

        // Cập nhật họ tên
        if (dto.getFullName() != null) {
            user.setFullName(normalize(dto.getFullName()));
        }

        // Cập nhật tiểu sử
        if (dto.getBio() != null) {
            user.setBio(dto.getBio().trim());
        }

        // Cập nhật ảnh đại diện
        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl().trim());
        }

        User updatedUser = userRepository.save(user);

        return toDto(updatedUser);
    }

    // Tìm người dùng theo ID
    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy người dùng!"
                        )
                );
    }

    // Chuẩn hóa chuỗi
    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String result = value.trim();

        return result.isBlank() ? null : result;
    }

    // Chuyển User entity thành UserProfileDto
    private UserProfileDto toDto(User user) {
        UserProfileDto dto = new UserProfileDto();

        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setBio(user.getBio());
        dto.setAvatarUrl(user.getAvatarUrl());

        dto.setRole(
                user.getRole() == null
                        ? "user"
                        : user.getRole().name().toLowerCase()
        );

        dto.setActive(user.getActive());
        dto.setCreatedAt(user.getCreatedAt());

        return dto;
    }
}