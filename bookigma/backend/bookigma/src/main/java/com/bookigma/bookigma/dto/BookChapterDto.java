package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BookChapterDto {
    private Integer index;
    private String title;
    private List<String> paragraphs;
    /** Chương của ebook premium mà người xem chưa mở khoá: không kèm nội dung. */
    private Boolean locked;
    /** Số đoạn của chương bị khoá, để tính phần trăm đọc đúng dù không gửi nội dung. */
    private Integer paragraphCount;
}
