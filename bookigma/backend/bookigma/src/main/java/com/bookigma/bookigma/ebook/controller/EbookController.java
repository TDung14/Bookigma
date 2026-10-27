package com.bookigma.bookigma.ebook.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.ebook.dto.EbookDtos.UnlockRequest;
import com.bookigma.bookigma.ebook.dto.EbookDtos.UnlockResponse;
import com.bookigma.bookigma.ebook.dto.EbookDtos.UnlockedBook;
import com.bookigma.bookigma.ebook.service.EbookAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Mở khoá ebook premium (bằng điểm hoặc lượt VIP hằng tuần). */
@RestController
@RequestMapping("/api/ebooks")
public class EbookController {
    private final EbookAccessService ebookAccessService;

    public EbookController(EbookAccessService ebookAccessService) {
        this.ebookAccessService = ebookAccessService;
    }

    @PostMapping("/{bookId}/unlock")
    public ResponseEntity<UnlockResponse> unlock(@CurrentUserId Long userId,
                                                 @PathVariable Long bookId,
                                                 @RequestBody(required = false) UnlockRequest request) {
        return ResponseEntity.ok(ebookAccessService.unlock(userId, bookId, request == null ? null : request.method()));
    }

    /** Các ebook premium người dùng đã mở khoá. */
    @GetMapping("/unlocked")
    public ResponseEntity<List<UnlockedBook>> unlocked(@CurrentUserId Long userId) {
        return ResponseEntity.ok(ebookAccessService.getUnlocked(userId));
    }
}
