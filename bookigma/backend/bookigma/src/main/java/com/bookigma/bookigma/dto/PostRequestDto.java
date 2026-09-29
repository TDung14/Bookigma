package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PostRequestDto {
    @NotNull
    private Long userId;
    @NotBlank
    private String content;
    private String imageUrl;
    private Long bookId;
    private Long pageId;
    private Long clubId;
    private String visibility;
}
