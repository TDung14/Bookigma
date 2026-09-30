package com.bookigma.bookigma.service;

import com.bookigma.bookigma.exception.ApiException;

import java.util.Locale;

/** Chuẩn hoá dữ liệu người dùng gửi lên trước khi lưu. */
public final class InputUtils {
    private InputUtils() {
    }

    public static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 1) + "…";
    }

    /** Link ảnh không bắt buộc, nhưng nếu có phải là http(s) để không nhúng được URL lạ vào trang. */
    public static String optionalHttpUrl(String value) {
        String url = blankToNull(value);
        if (url == null) {
            return null;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
            throw ApiException.badRequest("Link ảnh phải bắt đầu bằng http:// hoặc https://");
        }
        return url;
    }

    /** Đọc giá trị enum không phân biệt hoa thường ("pending" hay "PENDING" đều được). */
    public static <E extends Enum<E>> E parseEnum(Class<E> type, String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest(errorMessage);
        }
        try {
            return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest(errorMessage);
        }
    }
}
