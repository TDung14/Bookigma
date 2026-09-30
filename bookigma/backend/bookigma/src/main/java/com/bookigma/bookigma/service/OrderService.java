package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.CheckoutRequestDto;
import com.bookigma.bookigma.dto.OrderResponseDto;
import com.bookigma.bookigma.dto.StatusUpdateRequestDto;

import java.util.List;

public interface OrderService {
    // Người mua
    /** Chuyển toàn bộ giỏ hàng thành đơn: mỗi shop một đơn, mỗi hộp Blind Book một đơn riêng. */
    List<OrderResponseDto> checkout(Long userId, CheckoutRequestDto request);
    List<OrderResponseDto> getMyOrders(Long userId);
    OrderResponseDto getMyOrder(Long userId, Long orderId);
    OrderResponseDto cancelMyOrder(Long userId, Long orderId, String reason);
    OrderResponseDto completeMyOrder(Long userId, Long orderId);
    OrderResponseDto revealBlindBox(Long userId, Long orderId, Long itemId);

    // Kênh người bán
    List<OrderResponseDto> getShopOrders(Long userId);
    OrderResponseDto updateShopOrderStatus(Long userId, Long orderId, StatusUpdateRequestDto request);

    // Quản trị
    List<OrderResponseDto> getAllOrders(Long adminId);
}
