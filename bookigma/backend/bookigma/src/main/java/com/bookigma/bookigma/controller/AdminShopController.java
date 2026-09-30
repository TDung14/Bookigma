package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.BookResponseDto;
import com.bookigma.bookigma.dto.OrderResponseDto;
import com.bookigma.bookigma.dto.StatusUpdateRequestDto;
import com.bookigma.bookigma.service.BookService;
import com.bookigma.bookigma.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Quản trị cửa hàng: duyệt / gỡ sản phẩm và theo dõi toàn bộ đơn hàng. */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminShopController {
    private final BookService bookService;
    private final OrderService orderService;

    public AdminShopController(BookService bookService, OrderService orderService) {
        this.bookService = bookService;
        this.orderService = orderService;
    }

    @GetMapping("/books")
    public ResponseEntity<List<BookResponseDto>> getBooks(@CurrentUserId Long adminId) {
        return ResponseEntity.ok(bookService.getAllBooks(adminId));
    }

    @PatchMapping("/books/{id}/status")
    public ResponseEntity<BookResponseDto> updateBookStatus(@CurrentUserId Long adminId,
                                                            @PathVariable Long id,
                                                            @Valid @RequestBody StatusUpdateRequestDto request) {
        return ResponseEntity.ok(bookService.updateBookStatus(adminId, id, request.getStatus()));
    }

    @DeleteMapping("/books/{id}")
    public ResponseEntity<Map<String, Object>> deleteBook(@CurrentUserId Long adminId, @PathVariable Long id) {
        return ResponseEntity.ok(bookService.deleteBook(adminId, id));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponseDto>> getOrders(@CurrentUserId Long adminId) {
        return ResponseEntity.ok(orderService.getAllOrders(adminId));
    }
}
