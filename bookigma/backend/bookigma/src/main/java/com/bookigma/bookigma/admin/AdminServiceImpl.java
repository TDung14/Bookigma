package com.bookigma.bookigma.admin.service.impl;

import com.bookigma.bookigma.admin.dto.AdminUserRequest;
import com.bookigma.bookigma.admin.dto.AdminUserResponse;
import com.bookigma.bookigma.admin.dto.AdminUserUpdateRequest;
import com.bookigma.bookigma.admin.service.AdminService;
import com.bookigma.bookigma.dto.CommentResponseDto;
import com.bookigma.bookigma.dto.PostResponseDto;
import com.bookigma.bookigma.entity.Comment;
import com.bookigma.bookigma.entity.Post;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.repository.CommentRepository;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.repository.OrderRepository;
import com.bookigma.bookigma.repository.ShopRepository;
import com.bookigma.bookigma.service.PostService;
import com.bookigma.bookigma.report.dto.ReportResponse;
import com.bookigma.bookigma.report.dto.ResolveReportRequest;
import com.bookigma.bookigma.report.service.ReportService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final PostService postService;
    private final ReportService reportService;

    public AdminServiceImpl(
            UserRepository userRepository,
            PostRepository postRepository,
            CommentRepository commentRepository,
            OrderRepository orderRepository,
            ShopRepository shopRepository,
            PasswordEncoder passwordEncoder,
            PostService postService,
            ReportService reportService
    ) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.orderRepository = orderRepository;
        this.shopRepository = shopRepository;
        this.passwordEncoder = passwordEncoder;
        this.postService = postService;
        this.reportService = reportService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminUserResponse> getUsers(Long adminId) {
        requireAdmin(adminId);
        return userRepository.findAll().stream().map(this::toUserResponse).toList();
    }

    @Override
    @Transactional
    public AdminUserResponse createUser(Long adminId, AdminUserRequest request) {
        requireAdmin(adminId);

        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu tài khoản không hợp lệ.");
        }

        String username = normalize(request.username());
        String email = normalizeEmail(request.email());

        if (username == null || username.length() > 50) {
            throw new IllegalArgumentException("Tên đăng nhập không hợp lệ.");
        }
        if (email == null || email.length() > 100) {
            throw new IllegalArgumentException("Email không hợp lệ.");
        }
        if (request.password() == null || request.password().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự.");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại.");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email đã tồn tại.");
        }

        User.Role role = request.role() == null ? User.Role.USER : request.role();
        validateRole(role);

        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(normalize(request.fullName()))
                .role(role)
                .active(request.active() == null || request.active())
                .build();

        User saved = userRepository.save(user);
        ensureShopForSeller(saved);
        return toUserResponse(saved);
    }

    @Override
    @Transactional
    public AdminUserResponse updateUser(Long adminId, Long userId, AdminUserUpdateRequest request) {
        User admin = requireAdmin(adminId);
        User user = findUser(userId);

        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu cập nhật không hợp lệ.");
        }

        if (adminId.equals(userId) && request.active() != null && !request.active()) {
            throw new IllegalArgumentException("Không thể tự khóa tài khoản admin đang đăng nhập.");
        }
        if (adminId.equals(userId) && request.role() != null && request.role() != User.Role.ADMIN) {
            throw new IllegalArgumentException("Không thể tự hạ role của admin đang đăng nhập.");
        }

        if (request.username() != null) {
            String username = normalize(request.username());
            if (username == null || username.length() > 50) {
                throw new IllegalArgumentException("Tên đăng nhập không hợp lệ.");
            }
            if (!username.equalsIgnoreCase(user.getUsername())
                    && userRepository.existsByUsernameIgnoreCase(username)) {
                throw new IllegalArgumentException("Tên đăng nhập đã tồn tại.");
            }
            user.setUsername(username);
        }

        if (request.email() != null) {
            String email = normalizeEmail(request.email());
            if (email == null || email.length() > 100) {
                throw new IllegalArgumentException("Email không hợp lệ.");
            }
            if (!email.equalsIgnoreCase(user.getEmail())
                    && userRepository.existsByEmailIgnoreCase(email)) {
                throw new IllegalArgumentException("Email đã tồn tại.");
            }
            user.setEmail(email);
        }

        if (request.password() != null && !request.password().isBlank()) {
            if (request.password().length() < 6) {
                throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự.");
            }
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        if (request.fullName() != null) {
            user.setFullName(normalize(request.fullName()));
        }

        if (request.role() != null) {
            validateRole(request.role());
            user.setRole(request.role());
        }

        if (request.active() != null) {
            user.setActive(request.active());
        }

        User saved = userRepository.save(user);
        ensureShopForSeller(saved);
        return toUserResponse(saved);
    }

    @Override
    @Transactional
    public AdminUserResponse updateUserRole(Long adminId, Long userId, String role) {
        User admin = requireAdmin(adminId);
        User user = findUser(userId);

        if (adminId.equals(userId)) {
            throw new IllegalArgumentException("Không thể tự thay đổi role của admin đang đăng nhập.");
        }

        User.Role newRole;
        try {
            newRole = User.Role.valueOf(role == null ? "" : role.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Role không hợp lệ. Chỉ hỗ trợ USER, SHOP, MODERATOR, ADMIN.");
        }

        validateRole(newRole);
        user.setRole(newRole);
        User saved = userRepository.save(user);
        ensureShopForSeller(saved);
        return toUserResponse(saved);
    }

    @Override
    @Transactional
    public AdminUserResponse updateUserStatus(Long adminId, Long userId, boolean active) {
        requireAdmin(adminId);
        User user = findUser(userId);

        if (adminId.equals(userId) && !active) {
            throw new IllegalArgumentException("Không thể tự khóa tài khoản admin đang đăng nhập.");
        }

        user.setActive(active);
        return toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(Long adminId, Long userId) {
        requireAdmin(adminId);
        if (adminId.equals(userId)) {
            throw new IllegalArgumentException("Không thể tự xóa tài khoản admin đang đăng nhập.");
        }

        User user = findUser(userId);
        // orders.user_id không có ON DELETE CASCADE trong schema hiện tại.
        // Xóa đơn của user trước để việc xóa tài khoản không vướng khóa ngoại.
        orderRepository.deleteByUser_Id(userId);
        userRepository.delete(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PostResponseDto> getPosts(Long adminId) {
        requireAdmin(adminId);
        return postService.getAllPosts(null);
    }

    @Override
    @Transactional
    public void deletePost(Long adminId, Long postId) {
        requireAdmin(adminId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Bài viết không tồn tại."));
        postRepository.delete(post);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentResponseDto> getComments(Long adminId, Long postId) {
        requireAdmin(adminId);
        if (!postRepository.existsById(postId)) {
            throw new IllegalArgumentException("Bài viết không tồn tại.");
        }
        return commentRepository.findByPost_IdOrderByCreatedAtAsc(postId)
                .stream()
                .map(this::toCommentResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deleteComment(Long adminId, Long commentId) {
        requireAdmin(adminId);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Bình luận không tồn tại."));
        commentRepository.delete(comment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> getReports(Long adminId) {
        requireAdmin(adminId);
        return reportService.getAllForAdmin(adminId);
    }

    @Override
    @Transactional
    public ReportResponse resolveReport(Long adminId, Long reportId, ResolveReportRequest request) {
        requireAdmin(adminId);
        return reportService.resolve(adminId, reportId, request);
    }

    private User requireAdmin(Long adminId) {
        if (adminId == null) {
            throw new IllegalArgumentException("Bạn cần đăng nhập.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản quản trị không tồn tại."));

        if (!Boolean.TRUE.equals(admin.getActive())) {
            throw new IllegalArgumentException("Tài khoản quản trị đã bị khóa.");
        }

        if (admin.getRole() != User.Role.ADMIN) {
            throw new IllegalArgumentException("Bạn không có quyền quản trị.");
        }

        return admin;
    }


    private void ensureShopForSeller(User user) {
        if (user == null || (user.getRole() != User.Role.SHOP && user.getRole() != User.Role.MODERATOR)) {
            return;
        }
        if (shopRepository.findByOwner_Id(user.getId()).isEmpty()) {
            shopRepository.save(Shop.builder()
                    .owner(user)
                    .name((user.getRole() == User.Role.MODERATOR ? "Bookigma Moderator - " : "Bookigma Shop - ") + user.getUsername())
                    .description("Kênh bán sách trên Bookigma")
                    .verified(user.getRole() == User.Role.MODERATOR)
                    .build());
        }
    }

    private User findUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("ID người dùng không hợp lệ.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại."));
    }

    private void validateRole(User.Role role) {
        if (role != User.Role.USER && role != User.Role.SHOP && role != User.Role.MODERATOR && role != User.Role.ADMIN) {
            throw new IllegalArgumentException("Role không hợp lệ. Chỉ hỗ trợ USER, SHOP, MODERATOR, ADMIN.");
        }
    }

    private AdminUserResponse toUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getActive(),
                user.getCreatedAt()
        );
    }

    private CommentResponseDto toCommentResponse(Comment comment) {
        User user = comment.getUser();
        return CommentResponseDto.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .userId(user.getId())
                .username(user.getUsername())
                .authorName(user.getFullName() == null || user.getFullName().isBlank()
                        ? user.getUsername() : user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .content(comment.getContent())
                .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private String normalize(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isBlank() ? null : result;
    }

    private String normalizeEmail(String value) {
        String normalized = normalize(value);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }
}
