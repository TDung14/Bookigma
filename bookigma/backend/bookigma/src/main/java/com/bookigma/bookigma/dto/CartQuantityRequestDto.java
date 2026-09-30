package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CartQuantityRequestDto {
    @NotNull(message = "Thiếu số lượng")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    @Max(value = 99, message = "Số lượng tối đa là 99")
    private Integer quantity;
}
