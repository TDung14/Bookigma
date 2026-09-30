package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/** Thêm vào giỏ: gửi bookId (+ quantity) cho sách thường, hoặc blindBoxId cho hộp Blind Book. */
@Data
public class CartItemRequestDto {
    private Long bookId;

    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    @Max(value = 99, message = "Mỗi lần thêm tối đa 99 cuốn")
    private Integer quantity;

    private Long blindBoxId;
}
