package com.bookigma.bookigma.progress.service;

import com.bookigma.bookigma.progress.dto.ProgressDtos;

import java.util.List;

public interface ProgressService {
    List<ProgressDtos.ReadingProgressDto> list(Long userId);

    ProgressDtos.UpdateResponse update(Long userId, Long bookId, ProgressDtos.UpdateRequest request);

    ProgressDtos.ChapterCompleteResponse completeChapter(Long userId, Long bookId, Integer chapterIndex);
}
