package com.bookigma.bookigma.service;

import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.ShopRepository;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Kiểm tra người dùng hiện tại có tồn tại, còn hoạt động và đúng vai trò hay không.
 * Mọi service cần phân quyền đều đi qua đây để thông báo lỗi thống nhất.
 */
@Component
public class AccessGuard {
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    public AccessGuard(UserRepository userRepository, ShopRepository shopRepository) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
    }

    public User requireUser(Long userId) {
        if (userId == null) {
            throw ApiException.unauthorized("Bạn cần đăng nhập để thực hiện thao tác này.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không tồn tại, vui lòng đăng nhập lại."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw ApiException.forbidden("Tài khoản của bạn đã bị khóa.");
        }
        return user;
    }

    public User requireAdmin(Long userId) {
        User user = requireUser(userId);
        if (user.getRole() != User.Role.ADMIN) {
            throw ApiException.forbidden("Chỉ quản trị viên mới được thực hiện thao tác này.");
        }
        return user;
    }

    /** Shop của tài khoản chủ shop đang đăng nhập. */
    public Shop requireOwnShop(Long userId) {
        User user = requireUser(userId);
        if (user.getRole() != User.Role.SHOP) {
            throw ApiException.forbidden("Chỉ tài khoản chủ shop mới dùng được kênh người bán.");
        }
        return shopRepository.findByOwner_Id(user.getId())
                .orElseThrow(() -> ApiException.notFound("Tài khoản của bạn chưa được gắn với shop nào."));
    }
}
