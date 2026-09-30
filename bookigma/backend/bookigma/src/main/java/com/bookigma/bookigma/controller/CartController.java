package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.CartItemRequestDto;
import com.bookigma.bookigma.dto.CartItemResponseDto;
import com.bookigma.bookigma.dto.CartQuantityRequestDto;
import com.bookigma.bookigma.service.CartService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Giỏ hàng của người dùng đang đăng nhập. Mọi API đều trả về toàn bộ giỏ sau khi cập nhật. */
@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "*")
public class CartController {
    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public ResponseEntity<List<CartItemResponseDto>> getCart(@CurrentUserId Long userId) {
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @PostMapping("/items")
    public ResponseEntity<List<CartItemResponseDto>> addItem(@CurrentUserId Long userId,
                                                             @Valid @RequestBody CartItemRequestDto request) {
        return ResponseEntity.ok(cartService.addItem(userId, request));
    }

    @PatchMapping("/items/{id}")
    public ResponseEntity<List<CartItemResponseDto>> updateQuantity(@CurrentUserId Long userId,
                                                                    @PathVariable Long id,
                                                                    @Valid @RequestBody CartQuantityRequestDto request) {
        return ResponseEntity.ok(cartService.updateQuantity(userId, id, request.getQuantity()));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<List<CartItemResponseDto>> removeItem(@CurrentUserId Long userId, @PathVariable Long id) {
        return ResponseEntity.ok(cartService.removeItem(userId, id));
    }
}
