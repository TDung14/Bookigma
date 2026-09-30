package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.BookRequestDto;
import com.bookigma.bookigma.dto.BookResponseDto;

import java.util.List;
import java.util.Map;

public interface BookService {
    // Cửa hàng (ai cũng xem được)
    List<BookResponseDto> getActiveBooks();
    BookResponseDto getBook(Long bookId, Long viewerId);

    // Kênh người bán
    List<BookResponseDto> getShopBooks(Long userId);
    BookResponseDto createShopBook(Long userId, BookRequestDto request);
    BookResponseDto updateShopBook(Long userId, Long bookId, BookRequestDto request);
    Map<String, Object> deleteShopBook(Long userId, Long bookId);

    // Quản trị
    List<BookResponseDto> getAllBooks(Long adminId);
    BookResponseDto updateBookStatus(Long adminId, Long bookId, String status);
    Map<String, Object> deleteBook(Long adminId, Long bookId);
}
