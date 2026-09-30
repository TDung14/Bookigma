package com.bookigma.bookigma.config;

import com.bookigma.bookigma.exception.ApiException;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Lấy id người dùng hiện tại cho các tham số gắn @CurrentUserId.
 */
public class CurrentUserIdArgumentResolver implements HandlerMethodArgumentResolver {
    public static final String HEADER = "X-User-Id";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUserId.class)
                && Long.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        CurrentUserId annotation = parameter.getParameterAnnotation(CurrentUserId.class);
        boolean required = annotation == null || annotation.required();
        String raw = webRequest.getHeader(HEADER);

        if (raw == null || raw.isBlank()) {
            if (!required) {
                return null;
            }
            throw ApiException.unauthorized("Bạn cần đăng nhập để thực hiện thao tác này.");
        }

        try {
            return Long.valueOf(raw.trim());
        } catch (NumberFormatException ex) {
            throw ApiException.unauthorized("Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.");
        }
    }
}
