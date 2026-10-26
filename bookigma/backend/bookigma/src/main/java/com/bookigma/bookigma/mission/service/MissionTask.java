package com.bookigma.bookigma.mission.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/** Bốn nhiệm vụ cố định mỗi ngày. Server là nơi quyết định mức thưởng và điều kiện hoàn thành. */
public enum MissionTask {
    READ_10("read10", "readMinutes", 10, 40,
            "Đọc sách 10 phút", "Mở bất kỳ cuốn nào trong tủ sách"),
    CHAPTER("chapter", "chapters", 1, 50,
            "Đọc xong 1 chương", "Bấm \"Chương sau\" khi đọc hết"),
    SOCIAL("social", "social", 1, 25,
            "Đăng bài hoặc bình luận", "Chia sẻ cảm nhận trên bảng tin"),
    EXPLORE("explore", "explore", 3, 20,
            "Khám phá 3 cuốn sách mới", "Mở trang chi tiết của 3 cuốn khác nhau");

    private final String id;
    private final String metric;
    private final int goal;
    private final int reward;
    private final String label;
    private final String hint;

    MissionTask(String id, String metric, int goal, int reward, String label, String hint) {
        this.id = id;
        this.metric = metric;
        this.goal = goal;
        this.reward = reward;
        this.label = label;
        this.hint = hint;
    }

    public String id() {
        return id;
    }

    public String metric() {
        return metric;
    }

    public int goal() {
        return goal;
    }

    public int reward() {
        return reward;
    }

    public String label() {
        return label;
    }

    public String hint() {
        return hint;
    }

    public static Optional<MissionTask> find(String raw) {
        if (raw == null || raw.isBlank()) return Optional.empty();
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values()).filter(task -> task.id.equals(normalized)).findFirst();
    }
}
