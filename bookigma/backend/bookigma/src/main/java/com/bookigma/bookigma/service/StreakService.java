package com.bookigma.bookigma.service;

public interface StreakService {

    /** Ghi nhận một ngày có đọc sách; chỉ cộng điểm và tăng chuỗi ở lần đọc đầu tiên trong ngày. */
    StreakResult touch(Long userId);

    record StreakResult(int streak, int pointsAwarded, int balanceAfter, boolean advanced) {
    }
}
