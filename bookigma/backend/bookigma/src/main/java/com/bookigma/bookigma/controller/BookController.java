package com.bookigma.bookigma.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.dto.BookResponseDto;
import com.bookigma.bookigma.service.BookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*")
public class BookController {
    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    /** Sách đang bán trên cửa hàng (không kèm nội dung chương). */
    @GetMapping
    public ResponseEntity<List<BookResponseDto>> getBooks() {
        return ResponseEntity.ok(bookService.getActiveBooks());
    }

    /** Chi tiết sách kèm các chương đọc thử. Chủ shop / admin xem được cả sách chưa duyệt. */
    @GetMapping("/{id}")
    public ResponseEntity<BookResponseDto> getBook(@PathVariable Long id,
                                                   @CurrentUserId(required = false) Long userId) {
        return ResponseEntity.ok(bookService.getBook(id, userId));
    }
}
