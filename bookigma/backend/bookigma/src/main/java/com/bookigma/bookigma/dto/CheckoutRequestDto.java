package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Thông tin thanh toán. Sản phẩm lấy từ giỏ hàng trên server, không nhận danh sách hàng từ client. */
@Data
public class CheckoutRequestDto {
    @NotBlank(message = "Vui lòng nhập họ tên người nhận")
    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String recipientName;

    @NotBlank(message = "Vui lòng nhập số điện thoại")
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
    private String recipientPhone;

    @NotBlank(message = "Vui lòng nhập địa chỉ nhận hàng")
    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    private String shippingAddress;

    @NotBlank(message = "Hãy chọn phương thức thanh toán")
    private String paymentMethod;

    @Size(max = 30, message = "Mã giảm giá không hợp lệ")
    private String voucherCode;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String note;
}
