package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PostRequestDto {
    @NotBlank
    private String content;
    private String imageUrl;
    private Long bookId;
    private Long pageId;
    private Long clubId;
    private String visibility;
}
