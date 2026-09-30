package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Hộp Blind Book như người mua nhìn thấy: có manh mối nhưng không có tên sách. */
@Data
@Builder
public class BlindBoxResponseDto {
    private Long id;
    private String tierId;
    private String tierName;
    private String moodId;
    private String moodLabel;
    private BigDecimal price;
    private String status;
    /** Manh mối về cuốn sách bên trong (chỉ có khi vừa ghép hộp). */
    private List<String> hints;
}
