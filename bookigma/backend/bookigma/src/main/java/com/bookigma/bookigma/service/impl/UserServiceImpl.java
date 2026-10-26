
package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.AuthRequest;
import com.bookigma.bookigma.dto.ChangePasswordRequest;
import com.bookigma.bookigma.dto.RegisterResponse;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.service.EmailService;
import com.bookigma.bookigma.service.GoogleTokenVerifier;
import com.bookigma.bookigma.dto.UserProfileDto;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.UserPoint;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.repository.UserPointRepository;
import com.bookigma.bookigma.repository.ShopRepository;
import com.bookigma.bookigma.progress.repository.ReadingProgressRepository;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserPointRepository userPointRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final ShopRepository shopRepository;
    private final ReadingProgressRepository readingProgressRepository;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final String frontendUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    private static final int VERIFICATION_TTL_HOURS = 24;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private static final java.util.Set<String> MARITAL_STATUSES = java.util.Set.of(
            "Độc thân",
            "Đang hẹn hò",
            "Đã kết hôn",
            "Đã ly hôn",
            "Góa",
            "Phức tạp"
    );

    public UserServiceImpl(
            UserRepository userRepository,
            UserPointRepository userPointRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            ShopRepository shopRepository,
            ReadingProgressRepository readingProgressRepository,
            GoogleTokenVerifier googleTokenVerifier,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl
    ) {
        this.userRepository = userRepository;
        this.userPointRepository = userPointRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.shopRepository = shopRepository;
        this.readingProgressRepository = readingProgressRepository;
        this.googleTokenVerifier = googleTokenVerifier;
        this.frontendUrl = frontendUrl == null ? "" : frontendUrl.trim();
    }

    // Đăng ký tài khoản
    @Override
    @Transactional
    public RegisterResponse register(AuthRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu đăng ký không hợp lệ!");
        }

        String username = request.getUsername() == null ? "" : request.getUsername().trim().toLowerCase(java.util.Locale.ROOT);
        if (username.isBlank()) {
            throw new IllegalArgumentException("Tên đăng nhập không được để trống!");
        }
        if (username.length() > 50) {
            throw new IllegalArgumentException("Tên đăng nhập không được vượt quá 50 ký tự!");
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống!");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Mật khẩu không được để trống!");
        }
        if (request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự!");
        }
        // BCrypt chỉ nhận tối đa 72 byte UTF-8; ký tự có dấu chiếm 2-3 byte.
        if (request.getPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Mật khẩu quá dài, vui lòng rút ngắn lại!");
        }

        String email = request.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        if (email.length() > 100) {
            throw new IllegalArgumentException("Email không được vượt quá 100 ký tự!");
        }

        String fullName = normalize(request.getFullName());
        if (fullName != null && fullName.length() > 100) {
            throw new IllegalArgumentException("Họ và tên không được vượt quá 100 ký tự!");
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email này đã được đăng ký!");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(fullName)
                .role(User.Role.USER)
                .active(true)
                .emailVerified(false)
                .build();
        String rawToken = issueVerificationToken(user);

        User savedUser = userRepository.save(user);

        // Nếu gửi mail lỗi, exception làm rollback cả tài khoản vừa tạo.
        boolean emailSent = emailService.sendVerificationEmail(
                savedUser.getEmail(),
                savedUser.getUsername(),
                verificationLink(rawToken)
        );

        return new RegisterResponse(
                "Đăng ký thành công. Hãy kiểm tra email để xác thực tài khoản.",
                savedUser.getEmail(),
                emailSent
        );
    }

    @Override
    @Transactional
    public UserProfileDto login(AuthRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu đăng nhập không hợp lệ!");
        }

        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        if (username.isBlank()) {
            throw new IllegalArgumentException("Tên đăng nhập không được để trống!");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Mật khẩu không được để trống!");
        }

        User user = userRepository.findByUsernameIgnoreCase(username)
                .or(() -> userRepository.findByEmailIgnoreCase(username))
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

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException(
                    "Tài khoản chưa được xác thực email. Hãy bấm vào link trong email đăng ký hoặc gửi lại email xác thực."
            );
        }

        ensureShopForSeller(user);

        return toDto(user);
    }

    // Đăng nhập bằng Google ID token; tài khoản được liên kết qua email đã xác thực.
    @Override
    @Transactional
    public UserProfileDto loginWithGoogle(String credential) {
        GoogleTokenVerifier.GoogleUser googleUser = googleTokenVerifier.verify(credential);
        String email = googleUser.email();

        if (email.length() > 100) {
            throw ApiException.badRequest("Email Google quá dài để sử dụng trên hệ thống.");
        }

        User existingUser = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (existingUser != null) {
            if (!Boolean.TRUE.equals(existingUser.getActive())) {
                throw ApiException.forbidden("Tài khoản đã bị khóa hoặc vô hiệu hóa!");
            }
            if (!Boolean.TRUE.equals(existingUser.getEmailVerified())) {
                // Google đã chứng minh quyền sở hữu email. Đổi mật khẩu để người
                // đăng ký trước đó (nếu không phải chủ email) không đăng nhập được.
                existingUser.setEmailVerified(true);
                existingUser.setVerificationTokenHash(null);
                existingUser.setVerificationExpiresAt(null);
                existingUser.setVerificationSentAt(null);
                existingUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                userRepository.save(existingUser);
            }
            ensureShopForSeller(existingUser);
            return toDto(existingUser);
        }

        String fullName = normalize(googleUser.name());
        if (fullName != null && fullName.length() > 100) {
            fullName = fullName.substring(0, 100);
        }
        if (fullName == null) {
            fullName = emailLocalPart(email);
        }

        User newUser = User.builder()
                .username(uniqueUsernameFromEmail(email))
                .email(email)
                // Google không cung cấp mật khẩu; hash ngẫu nhiên để không thể đăng nhập bằng mật khẩu.
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .fullName(fullName)
                .role(User.Role.USER)
                .active(true)
                .emailVerified(true)
                .build();

        return toDto(userRepository.save(newUser));
    }

    @Override
    @Transactional
    public UserProfileDto verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Thiếu mã xác thực.");
        }

        User user = userRepository.findByVerificationTokenHash(sha256(token.trim()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Link xác thực không hợp lệ hoặc đã được sử dụng."
                ));

        if (user.getVerificationExpiresAt() == null
                || user.getVerificationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Link xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực."
            );
        }

        user.setEmailVerified(true);
        user.setVerificationTokenHash(null);
        user.setVerificationExpiresAt(null);
        user.setVerificationSentAt(null);

        return toDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email không được để trống.");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Email chưa được đăng ký trong hệ thống."));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Email này đã được xác thực.");
        }

        if (user.getVerificationSentAt() != null
                && user.getVerificationSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Vui lòng chờ khoảng " + RESEND_COOLDOWN_SECONDS + " giây trước khi gửi lại email xác thực."
            );
        }

        // Gửi trước; nếu SMTP lỗi thì token mới cũng không được lưu.
        String rawToken = issueVerificationToken(user);
        emailService.sendVerificationEmail(
                user.getEmail(),
                user.getUsername(),
                verificationLink(rawToken)
        );
        userRepository.save(user);
    }

    private String issueVerificationToken(User user) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        user.setVerificationTokenHash(sha256(rawToken));
        user.setVerificationExpiresAt(LocalDateTime.now().plusHours(VERIFICATION_TTL_HOURS));
        user.setVerificationSentAt(LocalDateTime.now());
        return rawToken;
    }

    private String verificationLink(String rawToken) {
        String base = frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
        return base + "/verify-email?token=" + rawToken;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Không thể tạo mã xác thực.", ex);
        }
    }

    private void ensureShopForSeller(User user) {
        // SHOP và MODERATOR đều có một kênh bán riêng. Tự khởi tạo nếu tài khoản
        // vừa được cấp role nhưng chưa có bản ghi trong bảng shops.
        if ((user.getRole() == User.Role.SHOP || user.getRole() == User.Role.MODERATOR)
                && shopRepository.findByOwner_Id(user.getId()).isEmpty()) {
            shopRepository.save(Shop.builder()
                    .owner(user)
                    .name((user.getRole() == User.Role.MODERATOR ? "Bookigma Moderator - " : "Bookigma Shop - ") + user.getUsername())
                    .description("Kênh bán sách trên Bookigma")
                    .verified(user.getRole() == User.Role.MODERATOR)
                    .build());
        }
    }

    private String emailLocalPart(String email) {
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private String uniqueUsernameFromEmail(String email) {
        String base = emailLocalPart(email).toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "");
        if (base.isBlank()) {
            base = "googleuser";
        }
        if (base.length() > 40) {
            base = base.substring(0, 40);
        }

        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsernameIgnoreCase(candidate)) {
            String suffixText = String.valueOf(suffix++);
            int maxBaseLength = 50 - suffixText.length();
            String trimmedBase = base.length() > maxBaseLength
                    ? base.substring(0, maxBaseLength)
                    : base;
            candidate = trimmedBase + suffixText;
        }
        return candidate;
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

        // Cập nhật ảnh bìa: chỉ nhận ảnh đã upload qua endpoint banner.
        if (dto.getBannerUrl() != null) {
            String bannerUrl = dto.getBannerUrl().trim();
            if (bannerUrl.isEmpty()) {
                user.setBannerUrl(null);
            } else if (!bannerUrl.startsWith("/uploads/banners/") || bannerUrl.length() > 255) {
                throw new IllegalArgumentException("Đường dẫn ảnh bìa không hợp lệ.");
            } else {
                user.setBannerUrl(bannerUrl);
            }
        }

        if (dto.getInterests() != null) {
            user.setInterests(normalizeInterests(dto.getInterests()));
        }

        if (dto.getHometown() != null) {
            user.setHometown(normalizeLimited(dto.getHometown(), 120, "Quê quán không được vượt quá 120 ký tự."));
        }

        if (dto.getCurrentLocation() != null) {
            user.setCurrentLocation(normalizeLimited(dto.getCurrentLocation(), 120, "Nơi ở hiện tại không được vượt quá 120 ký tự."));
        }

        if (dto.getMaritalStatus() != null) {
            String maritalStatus = normalize(dto.getMaritalStatus());
            if (maritalStatus != null && !MARITAL_STATUSES.contains(maritalStatus)) {
                throw new IllegalArgumentException("Trạng thái hôn nhân không hợp lệ.");
            }
            user.setMaritalStatus(maritalStatus);
        }

        User updatedUser = userRepository.save(user);

        return toDto(updatedUser);
    }


    @Override
    @Transactional
    public UserProfileDto updateUserAvatar(Long userId, String avatarUrl) {
        User user = findUser(userId);
        if (avatarUrl == null || !avatarUrl.startsWith("/uploads/avatars/")) {
            throw new IllegalArgumentException("Đường dẫn ảnh đại diện không hợp lệ.");
        }
        user.setAvatarUrl(avatarUrl);
        return toDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserProfileDto updateUserBanner(Long userId, String bannerUrl) {
        User user = findUser(userId);
        if (bannerUrl == null || !bannerUrl.startsWith("/uploads/banners/")) {
            throw new IllegalArgumentException("Đường dẫn ảnh bìa không hợp lệ.");
        }
        user.setBannerUrl(bannerUrl);
        return toDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email không được để trống.");
        }
        String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Email chưa được đăng ký trong hệ thống."));

        String newPassword = generateTemporaryPassword(10);

        // Gửi email trước. Nếu SMTP lỗi thì mật khẩu trong database không bị đổi
        // sang một mật khẩu mà người dùng chưa nhận được.
        emailService.sendNewPassword(user.getEmail(), user.getUsername(), newPassword);

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUser(userId);
        if (request == null || request.currentPassword() == null || request.newPassword() == null) {
            throw new IllegalArgumentException("Dữ liệu đổi mật khẩu không hợp lệ.");
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng.");
        }
        if (request.newPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private String generateTemporaryPassword(int length) {
        final String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        StringBuilder result = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            result.append(chars.charAt(secureRandom.nextInt(chars.length())));
        }
        return result.toString();
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

    private String normalizeLimited(String value, int maxLength, String message) {
        String normalized = normalize(value);
        if (normalized != null && normalized.length() > maxLength) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    // Sở thích lưu dạng "Văn học, Kinh doanh" để hiển thị thành từng chip.
    private String normalizeInterests(String value) {
        if (value == null) {
            return null;
        }
        java.util.LinkedHashSet<String> unique = new java.util.LinkedHashSet<>();
        for (String part : value.split(",")) {
            String item = part.trim();
            if (!item.isEmpty()) {
                unique.add(item);
            }
        }
        if (unique.isEmpty()) {
            return null;
        }
        String joined = String.join(", ", unique);
        if (joined.length() > 500) {
            throw new IllegalArgumentException("Sở thích không được vượt quá 500 ký tự.");
        }
        return joined;
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
        dto.setBannerUrl(user.getBannerUrl());
        dto.setInterests(user.getInterests());
        dto.setHometown(user.getHometown());
        dto.setCurrentLocation(user.getCurrentLocation());
        dto.setMaritalStatus(user.getMaritalStatus());

        // API trả đúng giá trị enum trong database:
        // USER / MODERATOR / ADMIN.
        // Frontend sẽ chuẩn hóa về user / moderator / admin khi hiển thị.
        dto.setRole(
                user.getRole() == null
                        ? User.Role.USER.name()
                        : user.getRole().name()
        );

        dto.setActive(user.getActive());
        dto.setPoints(userPointRepository.findByUserId(user.getId())
                .map(UserPoint::getTotalPoints)
                .orElse(0));
        dto.setStreak(user.getStreak() == null ? 0 : user.getStreak());
        dto.setBooksRead((int) readingProgressRepository.countByUser_IdAndFinishedTrue(user.getId()));
        dto.setCreatedAt(user.getCreatedAt());

        return dto;
    }
}