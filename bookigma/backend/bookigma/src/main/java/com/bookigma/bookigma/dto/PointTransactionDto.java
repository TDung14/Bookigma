package com.bookigma.bookigma.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointTransactionDto {
    private Long id;
    private Integer amount;
    private Integer balanceAfter;
    private String type;
    private String referenceId;
    private String description;
    private LocalDateTime createdAt;
}
