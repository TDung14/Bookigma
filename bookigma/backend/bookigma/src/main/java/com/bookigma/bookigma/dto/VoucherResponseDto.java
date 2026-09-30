package com.bookigma.bookigma.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class VoucherResponseDto {
    private String code;
    private String label;
    /** percent | amount | shipping */
    private String type;
    private BigDecimal value;
    private BigDecimal maxDiscount;
    private BigDecimal minOrder;
}
