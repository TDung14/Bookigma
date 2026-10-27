package com.bookigma.bookigma.ebook.dto;

import java.time.LocalDateTime;

/** Dữ liệu trao đổi của phần ebook premium. */
public final class EbookDtos {
    private EbookDtos() {
    }

    /** method: "points" (trừ điểm) hoặc "vip" (lượt miễn phí hằng tuần của VIP). */
    public record UnlockRequest(String method) {
    }

    /** Hạn mức mở khoá ebook miễn phí của VIP trong tuần (tuần bắt đầu từ thứ Hai). */
    public record WeeklyQuota(boolean vip, int limit, long used, long remaining, long resetsAtEpochMs) {
    }

    public record UnlockResponse(
            Long bookId,
            boolean unlocked,
            boolean alreadyUnlocked,
            String source,
            int pointsSpent,
            WeeklyQuota weeklyQuota
    ) {
    }

    public record UnlockedBook(Long bookId, String source, int pointsSpent, LocalDateTime unlockedAt) {
    }
}
