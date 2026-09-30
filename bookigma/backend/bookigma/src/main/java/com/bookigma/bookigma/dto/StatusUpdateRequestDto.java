package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Đổi trạng thái (sản phẩm, đơn hàng, tin trao đổi) kèm ghi chú tuỳ chọn. */
@Data
public class StatusUpdateRequestDto {
    @NotBlank(message = "Thiếu trạng thái mới")
    private String status;

    @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
    private String note;
}
