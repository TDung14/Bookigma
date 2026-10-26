package com.bookigma.bookigma.service;

import java.util.Locale;

/** Các hoạt động sinh điểm do server quy định, tránh client tự đặt số điểm. */
public enum PointActivity {
    READ_MINUTE(1, "Đọc sách mỗi phút", false),
    FINISH_CHAPTER(10, "Đọc xong một chương", false),
    FINISH_BOOK(50, "Đọc xong cả cuốn sách", false),
    DAILY_STREAK(5, "Giữ chuỗi đọc mỗi ngày", false),
    QUIZ_CORRECT(10, "Trả lời đúng câu hỏi đọc hiểu", true),
    POMODORO(20, "Hoàn thành phiên đọc Pomodoro", true);

    private final int points;
    private final String description;
    /** Chỉ hai hoạt động gắn với hành vi trình đọc được client tự báo; phần còn lại server tự tính. */
    private final boolean clientAwardable;

    PointActivity(int points, String description, boolean clientAwardable) {
        this.points = points;
        this.description = description;
        this.clientAwardable = clientAwardable;
    }

    public boolean isClientAwardable() {
        return clientAwardable;
    }

    public int getPoints() {
        return points;
    }

    public String getDescription() {
        return description;
    }

    public static PointActivity parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Thiếu loại hoạt động tích điểm.");
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Loại hoạt động tích điểm không hợp lệ.");
        }
    }

    /** Chặn client tự cộng các mốc điểm mà server đã tự tính (đọc phút, xong chương, xong sách, chuỗi ngày). */
    public static PointActivity parseClientAwardable(String raw) {
        PointActivity activity = parse(raw);
        if (!activity.clientAwardable) {
            throw new IllegalArgumentException("Hoạt động này được hệ thống tự ghi nhận, không thể tự cộng điểm.");
        }
        return activity;
    }
}
