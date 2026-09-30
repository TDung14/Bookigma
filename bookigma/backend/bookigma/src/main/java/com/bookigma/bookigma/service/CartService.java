package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.CartItemRequestDto;
import com.bookigma.bookigma.dto.CartItemResponseDto;

import java.util.List;

/** Mọi thao tác đều trả về toàn bộ giỏ hàng sau khi cập nhật để frontend thay state một lần. */
public interface CartService {
    List<CartItemResponseDto> getCart(Long userId);
    List<CartItemResponseDto> addItem(Long userId, CartItemRequestDto request);
    List<CartItemResponseDto> updateQuantity(Long userId, Long itemId, int quantity);
    List<CartItemResponseDto> removeItem(Long userId, Long itemId);
}
