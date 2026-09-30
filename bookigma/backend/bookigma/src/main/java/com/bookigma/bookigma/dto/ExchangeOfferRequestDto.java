package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExchangeOfferRequestDto {
    @NotBlank(message = "Hãy cho biết cuốn sách bạn mang ra đổi")
    @Size(max = 255, message = "Tên sách tối đa 255 ký tự")
    private String offeredBook;

    @Size(max = 1000, message = "Lời nhắn tối đa 1.000 ký tự")
    private String message;
}
