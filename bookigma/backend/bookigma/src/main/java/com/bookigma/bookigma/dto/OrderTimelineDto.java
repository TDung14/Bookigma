package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class OrderTimelineDto {
    private String status;
    private String note;
    private LocalDateTime at;
}
