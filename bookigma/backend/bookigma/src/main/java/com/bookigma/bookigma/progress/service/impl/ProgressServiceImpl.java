package com.bookigma.bookigma.progress.service.impl;

import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.mission.dto.MissionDtos;
import com.bookigma.bookigma.mission.service.MissionService;
import com.bookigma.bookigma.progress.dto.ProgressDtos;
import com.bookigma.bookigma.progress.entity.CompletedChapter;
import com.bookigma.bookigma.progress.entity.ReadingProgress;
import com.bookigma.bookigma.progress.repository.CompletedChapterRepository;
import com.bookigma.bookigma.progress.repository.ReadingProgressRepository;
import com.bookigma.bookigma.progress.service.ProgressService;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.PointActivity;
import com.bookigma.bookigma.service.PointService;
import com.bookigma.bookigma.service.StreakService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class ProgressServiceImpl implements ProgressService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_SECONDS_PER_UPDATE = 300;

    private final ReadingProgressRepository progressRepository;
    private final CompletedChapterRepository completedChapterRepository;
    private final BookRepository bookRepository;
    private final PointService pointService;
    private final MissionService missionService;
    private final StreakService streakService;
    private final AccessGuard accessGuard;

    public ProgressServiceImpl(ReadingProgressRepository progressRepository,
                               CompletedChapterRepository completedChapterRepository,
                               BookRepository bookRepository,
                               PointService pointService,
                               MissionService missionService,
                               StreakService streakService,
                               AccessGuard accessGuard) {
        this.progressRepository = progressRepository;
        this.completedChapterRepository = completedChapterRepository;
        this.bookRepository = bookRepository;
        this.pointService = pointService;
        this.missionService = missionService;
        this.streakService = streakService;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProgressDtos.ReadingProgressDto> list(Long userId) {
        accessGuard.requireUser(userId);
        return progressRepository.findByUser_IdOrderByLastReadAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public ProgressDtos.UpdateResponse update(Long userId, Long bookId, ProgressDtos.UpdateRequest request) {
        User user = accessGuard.requireUser(userId);
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> ApiException.notFound("Sách không tồn tại."));

        ReadingProgress progress = progressRepository.findByUser_IdAndBook_Id(userId, bookId)
                .orElseGet(() -> ReadingProgress.builder().user(user).book(book).build());

        boolean wasFinished = Boolean.TRUE.equals(progress.getFinished());

        int delta = clamp(request == null ? null : request.getSecondsDelta(), 0, MAX_SECONDS_PER_UPDATE);
        int beforeSeconds = progress.getSecondsRead() == null ? 0 : progress.getSecondsRead();
        int afterSeconds = beforeSeconds + delta;

        Integer chapterIndex = request == null ? null : request.getChapterIndex();
        if (chapterIndex != null) {
            progress.setChapterIndex(Math.max(0, chapterIndex));
        }
        Integer paragraphIndex = request == null ? null : request.getParagraphIndex();
        if (paragraphIndex != null) {
            progress.setParagraphIndex(Math.max(0, paragraphIndex));
        }

        int oldPercent = progress.getPercent() == null ? 0 : progress.getPercent();
        int newPercent = request == null || request.getPercent() == null
                ? oldPercent
                : Math.max(oldPercent, clamp(request.getPercent(), 0, 100));
        boolean finished = wasFinished
                || (request != null && Boolean.TRUE.equals(request.getFinished()));
        if (finished) {
            newPercent = 100;
        }

        progress.setSecondsRead(afterSeconds);
        progress.setPercent(newPercent);
        progress.setFinished(finished);
        progress.setLastReadAt(LocalDateTime.now(VN_ZONE));
        ReadingProgress saved = progressRepository.save(progress);

        int pointsAwarded = 0;
        Integer balanceAfter = null;

        int minutesEarned = afterSeconds / 60 - beforeSeconds / 60;
        if (minutesEarned > 0) {
            PointTransactionDto tx = pointService.addRewardPoints(
                    userId,
                    minutesEarned * PointActivity.READ_MINUTE.getPoints(),
                    PointActivity.READ_MINUTE.name(),
                    "READ:" + bookId,
                    "Đọc sách " + minutesEarned + " phút"
            );
            pointsAwarded += tx.getAmount();
            balanceAfter = tx.getBalanceAfter();
        }

        // Chỉ thưởng khi cuốn sách vừa được đánh dấu hoàn thành lần đầu.
        if (finished && !wasFinished) {
            PointTransactionDto tx = pointService.addRewardPoints(
                    userId,
                    PointActivity.FINISH_BOOK.getPoints(),
                    PointActivity.FINISH_BOOK.name(),
                    "BOOK:" + bookId,
                    "Hoàn thành sách: " + safeTitle(book)
            );
            pointsAwarded += tx.getAmount();
            balanceAfter = tx.getBalanceAfter();
        }

        MissionDtos.DailyMissionDto missions = delta > 0
                ? missionService.recordReading(userId, delta)
                : missionService.getToday(userId);

        int streak = user.getStreak() == null ? 0 : user.getStreak();
        boolean streakAdvanced = false;
        if (delta > 0) {
            StreakService.StreakResult result = streakService.touch(userId);
            streak = result.streak();
            streakAdvanced = result.advanced();
            if (result.pointsAwarded() > 0) {
                pointsAwarded += result.pointsAwarded();
                balanceAfter = result.balanceAfter();
            }
        }

        if (balanceAfter == null) {
            balanceAfter = pointService.getOrCreateUserPoint(userId).getTotalPoints();
        }

        return ProgressDtos.UpdateResponse.builder()
                .progress(toDto(saved))
                .streak(streak)
                .streakAdvanced(streakAdvanced)
                .pointsAwarded(pointsAwarded)
                .balanceAfter(balanceAfter)
                .missions(missions)
                .build();
    }

    @Override
    @Transactional
    public ProgressDtos.ChapterCompleteResponse completeChapter(Long userId, Long bookId, Integer chapterIndex) {
        User user = accessGuard.requireUser(userId);
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> ApiException.notFound("Sách không tồn tại."));
        if (chapterIndex == null || chapterIndex < 0) {
            throw ApiException.badRequest("Chương không hợp lệ.");
        }

        boolean firstTime = !completedChapterRepository
                .existsByUser_IdAndBook_IdAndChapterIndex(userId, bookId, chapterIndex);

        int pointsAwarded = 0;
        Integer balanceAfter = null;
        MissionDtos.DailyMissionDto missions;

        if (firstTime) {
            completedChapterRepository.save(CompletedChapter.builder()
                    .user(user)
                    .book(book)
                    .chapterIndex(chapterIndex)
                    .build());
            missions = missionService.recordChapter(userId);
            PointTransactionDto tx = pointService.addRewardPoints(
                    userId,
                    PointActivity.FINISH_CHAPTER.getPoints(),
                    PointActivity.FINISH_CHAPTER.name(),
                    "CHAPTER:" + bookId + ":" + chapterIndex,
                    "Đọc xong chương " + (chapterIndex + 1)
            );
            pointsAwarded = tx.getAmount();
            balanceAfter = tx.getBalanceAfter();
        } else {
            missions = missionService.getToday(userId);
        }

        if (balanceAfter == null) {
            balanceAfter = pointService.getOrCreateUserPoint(userId).getTotalPoints();
        }

        return ProgressDtos.ChapterCompleteResponse.builder()
                .firstTime(firstTime)
                .pointsAwarded(pointsAwarded)
                .balanceAfter(balanceAfter)
                .missions(missions)
                .build();
    }

    private int clamp(Integer value, int min, int max) {
        if (value == null) return min;
        return Math.max(min, Math.min(max, value));
    }

    private String safeTitle(Book book) {
        return book.getTitle() == null || book.getTitle().isBlank() ? "Không tên" : book.getTitle();
    }

    private ProgressDtos.ReadingProgressDto toDto(ReadingProgress progress) {
        return ProgressDtos.ReadingProgressDto.builder()
                .bookId(progress.getBook().getId())
                .chapterIndex(progress.getChapterIndex())
                .paragraphIndex(progress.getParagraphIndex())
                .percent(progress.getPercent())
                .secondsRead(progress.getSecondsRead())
                .finished(progress.getFinished())
                .lastReadAt(progress.getLastReadAt())
                .build();
    }
}
