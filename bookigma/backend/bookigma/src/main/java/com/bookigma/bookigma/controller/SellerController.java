package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.BookRequestDto;
import com.bookigma.bookigma.dto.BookResponseDto;
import com.bookigma.bookigma.dto.OrderResponseDto;
import com.bookigma.bookigma.dto.StatusUpdateRequestDto;
import com.bookigma.bookigma.service.BookService;
import com.bookigma.bookigma.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Kênh người bán: chủ shop quản lý sản phẩm và xử lý đơn của shop mình. */
@RestController
@RequestMapping("/api/seller")
@CrossOrigin(origins = "*")
public class SellerController {
    private final BookService bookService;
    private final OrderService orderService;

    public SellerController(BookService bookService, OrderService orderService) {
        this.bookService = bookService;
        this.orderService = orderService;
    }

    @GetMapping("/books")
    public ResponseEntity<List<BookResponseDto>> getBooks(@CurrentUserId Long userId) {
        return ResponseEntity.ok(bookService.getShopBooks(userId));
    }

    @PostMapping("/books")
    public ResponseEntity<BookResponseDto> createBook(@CurrentUserId Long userId,
                                                      @Valid @RequestBody BookRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createShopBook(userId, request));
    }

    @PutMapping("/books/{id}")
    public ResponseEntity<BookResponseDto> updateBook(@CurrentUserId Long userId,
                                                      @PathVariable Long id,
                                                      @Valid @RequestBody BookRequestDto request) {
        return ResponseEntity.ok(bookService.updateShopBook(userId, id, request));
    }

    @DeleteMapping("/books/{id}")
    public ResponseEntity<Map<String, Object>> deleteBook(@CurrentUserId Long userId, @PathVariable Long id) {
        return ResponseEntity.ok(bookService.deleteShopBook(userId, id));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponseDto>> getOrders(@CurrentUserId Long userId) {
        return ResponseEntity.ok(orderService.getShopOrders(userId));
    }

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<OrderResponseDto> updateOrderStatus(@CurrentUserId Long userId,
                                                              @PathVariable Long id,
                                                              @Valid @RequestBody StatusUpdateRequestDto request) {
        return ResponseEntity.ok(orderService.updateShopOrderStatus(userId, id, request));
    }
}
