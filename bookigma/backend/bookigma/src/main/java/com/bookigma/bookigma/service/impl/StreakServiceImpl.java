package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.PointActivity;
import com.bookigma.bookigma.service.PointService;
import com.bookigma.bookigma.service.StreakService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class StreakServiceImpl implements StreakService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserRepository userRepository;
    private final PointService pointService;

    public StreakServiceImpl(UserRepository userRepository, PointService pointService) {
        this.userRepository = userRepository;
        this.pointService = pointService;
    }

    @Override
    @Transactional
    public StreakResult touch(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không tồn tại, vui lòng đăng nhập lại."));

        LocalDate today = LocalDate.now(VN_ZONE);
        int current = user.getStreak() == null ? 0 : user.getStreak();
        LocalDate last = user.getLastStreakDate();

        if (today.equals(last)) {
            int balance = pointService.getOrCreateUserPoint(userId).getTotalPoints();
            return new StreakResult(current, 0, balance, false);
        }

        // Đọc vào ngày kế tiếp thì nối chuỗi; bỏ cách ngày thì bắt đầu lại từ 1.
        int next = (last != null && last.plusDays(1).equals(today)) ? current + 1 : 1;
        user.setStreak(next);
        user.setLastStreakDate(today);
        userRepository.save(user);

        PointTransactionDto tx = pointService.addRewardPoints(
                userId,
                PointActivity.DAILY_STREAK.getPoints(),
                PointActivity.DAILY_STREAK.name(),
                today.toString(),
                "Chuỗi đọc " + next + " ngày liên tiếp"
        );
        return new StreakResult(next, tx.getAmount(), tx.getBalanceAfter(), true);
    }
}
