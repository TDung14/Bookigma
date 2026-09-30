package com.bookigma.bookigma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExchangeListingRequestDto {
    @NotBlank(message = "Hãy điền tên cuốn sách bạn có")
    @Size(max = 255, message = "Tên sách tối đa 255 ký tự")
    private String bookTitle;

    @NotBlank(message = "Hãy điền cuốn sách bạn muốn đổi lấy")
    @Size(max = 255, message = "Mục muốn đổi tối đa 255 ký tự")
    private String wanted;

    @NotBlank(message = "Hãy chọn tình trạng sách")
    @Size(max = 30, message = "Tình trạng tối đa 30 ký tự")
    private String condition;

    @NotBlank(message = "Hãy chọn khu vực")
    @Size(max = 100, message = "Khu vực tối đa 100 ký tự")
    private String location;

    @Size(max = 500, message = "Link ảnh bìa tối đa 500 ký tự")
    private String coverUrl;

    @Size(max = 2000, message = "Mô tả tối đa 2.000 ký tự")
    private String note;
}
