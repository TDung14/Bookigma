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
}
