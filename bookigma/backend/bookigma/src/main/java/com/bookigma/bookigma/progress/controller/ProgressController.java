package com.bookigma.bookigma.progress.controller;

import com.bookigma.bookigma.config.CurrentUserId;
import com.bookigma.bookigma.progress.dto.ProgressDtos;
import com.bookigma.bookigma.progress.service.ProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin(origins = "*")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @GetMapping
    public ResponseEntity<List<ProgressDtos.ReadingProgressDto>> list(@CurrentUserId Long userId) {
        return ResponseEntity.ok(progressService.list(userId));
    }

    @PutMapping("/{bookId}")
    public ResponseEntity<ProgressDtos.UpdateResponse> update(@CurrentUserId Long userId,
                                                              @PathVariable Long bookId,
                                                              @RequestBody(required = false) ProgressDtos.UpdateRequest request) {
        return ResponseEntity.ok(progressService.update(userId, bookId, request));
    }

    @PostMapping("/{bookId}/chapters/{chapterIndex}/complete")
    public ResponseEntity<ProgressDtos.ChapterCompleteResponse> completeChapter(@CurrentUserId Long userId,
                                                                                @PathVariable Long bookId,
                                                                                @PathVariable Integer chapterIndex) {
        return ResponseEntity.ok(progressService.completeChapter(userId, bookId, chapterIndex));
    }
}
