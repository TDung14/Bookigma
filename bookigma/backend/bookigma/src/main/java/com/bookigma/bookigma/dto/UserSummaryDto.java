package com.bookigma.bookigma.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Thông tin rút gọn của một người dùng để hiển thị kèm tin đăng, đề nghị, đơn hàng. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String name;
    private String avatarUrl;
}
