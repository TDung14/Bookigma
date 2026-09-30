package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryResponseDto {
    private Integer id;
    private String name;
    private String slug;
}
