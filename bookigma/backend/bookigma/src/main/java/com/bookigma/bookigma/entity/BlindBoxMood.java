package com.bookigma.bookigma.entity;

import java.util.List;

/**
 * Các "tâm trạng" người mua chọn cho hộp Blind Book. Mỗi tâm trạng ánh xạ sang thể loại và từ khoá
 * có thật trong kho sách, nhờ vậy kết quả ghép luôn hợp lý chứ không ngẫu nhiên mù.
 */
public enum BlindBoxMood {
    MOTIVATION("motivation", "Cần động lực",
            List.of("Truyền cảm hứng", "Tâm lý - Kỹ năng"),
            List.of("ước mơ", "hành trình", "thói quen", "phát triển bản thân", "tuổi trẻ")),
    CRY("cry", "Muốn khóc một trận",
            List.of("Văn học Việt Nam", "Văn học nước ngoài"),
            List.of("buồn", "cảm động", "tuổi thơ", "tình yêu", "gia đình")),
    SKILL("skill", "Học một kỹ năng mới",
            List.of("Tâm lý - Kỹ năng", "Kinh tế"),
            List.of("kỹ năng mềm", "giao tiếp", "năng suất", "ra quyết định", "thói quen")),
    ESCAPE("escape", "Thoát khỏi thực tại",
            List.of("Văn học nước ngoài", "Thiếu nhi", "Văn học Việt Nam"),
            List.of("phiêu lưu", "kinh điển", "hành trình", "tâm linh")),
    CURIOUS("curious", "Tò mò về thế giới",
            List.of("Khoa học - Công nghệ"),
            List.of("khoa học", "lịch sử", "công nghệ", "xã hội", "tiến hóa"));

    private final String id;
    private final String label;
    private final List<String> categories;
    private final List<String> tags;

    BlindBoxMood(String id, String label, List<String> categories, List<String> tags) {
        this.id = id;
        this.label = label;
        this.categories = categories;
        this.tags = tags;
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public List<String> getCategories() {
        return categories;
    }

    public List<String> getTags() {
        return tags;
    }

    /** Nhận cả id viết thường ("cry") lẫn tên enum ("CRY"); trả về null nếu không khớp. */
    public static BlindBoxMood fromId(String value) {
        if (value == null) {
            return null;
        }
        for (BlindBoxMood mood : values()) {
            if (mood.id.equalsIgnoreCase(value.trim()) || mood.name().equalsIgnoreCase(value.trim())) {
                return mood;
            }
        }
        return null;
    }
}
