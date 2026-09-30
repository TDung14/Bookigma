package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.CheckoutRequestDto;
import com.bookigma.bookigma.dto.NoteRequestDto;
import com.bookigma.bookigma.dto.OrderResponseDto;
import com.bookigma.bookigma.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Đơn hàng của người mua. */
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /** Thanh toán giỏ hàng. Trả về danh sách đơn đã tạo (giỏ được tách theo shop). */
    @PostMapping
    public ResponseEntity<List<OrderResponseDto>> checkout(@CurrentUserId Long userId,
                                                           @Valid @RequestBody CheckoutRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.checkout(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponseDto>> getMyOrders(@CurrentUserId Long userId) {
        return ResponseEntity.ok(orderService.getMyOrders(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseDto> getMyOrder(@CurrentUserId Long userId, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getMyOrder(userId, id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<OrderResponseDto> cancel(@CurrentUserId Long userId,
                                                   @PathVariable Long id,
                                                   @Valid @RequestBody(required = false) NoteRequestDto request) {
        return ResponseEntity.ok(orderService.cancelMyOrder(userId, id, request == null ? null : request.getNote()));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<OrderResponseDto> complete(@CurrentUserId Long userId, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.completeMyOrder(userId, id));
    }

    /** Mở hộp Blind Book trong một đơn đã giao: lộ tên cuốn sách bên trong. */
    @PatchMapping("/{orderId}/items/{itemId}/reveal")
    public ResponseEntity<OrderResponseDto> reveal(@CurrentUserId Long userId,
                                                   @PathVariable Long orderId,
                                                   @PathVariable Long itemId) {
        return ResponseEntity.ok(orderService.revealBlindBox(userId, orderId, itemId));
    }
}
