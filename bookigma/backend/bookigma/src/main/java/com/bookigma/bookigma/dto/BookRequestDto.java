package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Dữ liệu shop gửi lên khi thêm / sửa sản phẩm. */
@Data
public class BookRequestDto {
    @NotBlank(message = "Tên sách không được để trống")
    @Size(max = 255, message = "Tên sách tối đa 255 ký tự")
    private String title;

    @NotBlank(message = "Tác giả không được để trống")
    @Size(max = 100, message = "Tên tác giả tối đa 100 ký tự")
    private String author;

    @NotBlank(message = "Hãy chọn thể loại")
    private String category;

    @NotNull(message = "Giá bán không được để trống")
    @DecimalMin(value = "1000", message = "Giá bán tối thiểu là 1.000đ")
    private BigDecimal price;

    private BigDecimal originalPrice;

    @NotNull(message = "Tồn kho không được để trống")
    @Min(value = 0, message = "Tồn kho không được âm")
    @Max(value = 100000, message = "Tồn kho tối đa 100.000 cuốn")
    private Integer stock;

    @Min(value = 1, message = "Số trang phải lớn hơn 0")
    private Integer pages;

    @Size(max = 500, message = "Link ảnh bìa tối đa 500 ký tự")
    private String coverUrl;

    @Size(max = 5000, message = "Mô tả tối đa 5.000 ký tự")
    private String description;

    private List<String> tags;
}
