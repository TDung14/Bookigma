package com.bookigma.bookigma.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Đánh dấu tham số controller nhận id của người dùng đang đăng nhập.
 *
 * Hiện dự án chưa có JWT nên frontend gửi id qua header X-User-Id. Khi thêm JWT, chỉ cần sửa
 * CurrentUserIdArgumentResolver để lấy id từ token — các controller không phải đổi gì.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUserId {
    /** false: khách chưa đăng nhập vẫn gọi được, khi đó tham số nhận giá trị null. */
    boolean required() default true;
}
