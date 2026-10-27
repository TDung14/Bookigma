package com.bookigma.bookigma.ebook.service;

import com.bookigma.bookigma.dto.BookChapterDto;
import com.bookigma.bookigma.dto.BookResponseDto;
import com.bookigma.bookigma.ebook.dto.EbookDtos.UnlockResponse;
import com.bookigma.bookigma.ebook.dto.EbookDtos.UnlockedBook;
import com.bookigma.bookigma.ebook.dto.EbookDtos.WeeklyQuota;
import com.bookigma.bookigma.ebook.entity.EbookUnlock;
import com.bookigma.bookigma.ebook.repository.EbookUnlockRepository;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.PointService;
import com.bookigma.bookigma.vip.entity.VipSubscription;
import com.bookigma.bookigma.vip.repository.VipSubscriptionRepository;
import com.bookigma.bookigma.vip.service.VipPerkRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Quyền đọc ebook premium. Nội dung chương bị khoá được cắt ngay ở server (GET /api/books/{id}),
 * nên người chưa mở khoá không thể đọc tiếp dù sửa giao diện.
 */
@Service
public class EbookAccessService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final BookRepository bookRepository;
    private final EbookUnlockRepository unlockRepository;
    private final VipSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final PointService pointService;
    private final AccessGuard accessGuard;

    public EbookAccessService(BookRepository bookRepository,
                              EbookUnlockRepository unlockRepository,
                              VipSubscriptionRepository subscriptionRepository,
                              UserRepository userRepository,
                              PointService pointService,
                              AccessGuard accessGuard) {
        this.bookRepository = bookRepository;
        this.unlockRepository = unlockRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.pointService = pointService;
        this.accessGuard = accessGuard;
    }

    /**
     * Gắn thông tin premium vào chi tiết sách và cắt nội dung các chương sau phần đọc thử
     * nếu người xem chưa có quyền đọc cả cuốn. canManage: chủ shop của sách hoặc admin.
     */
    @Transactional(readOnly = true)
    public BookResponseDto applyAccess(BookResponseDto dto, Book book, Long viewerId, boolean canManage) {
        boolean premium = Boolean.TRUE.equals(book.getPremium());
        dto.setPremium(premium);
        if (!premium) {
            dto.setEbookUnlocked(true);
            return dto;
        }

        boolean fullAccess = canManage
                || (viewerId != null && unlockRepository.existsByUser_IdAndBookId(viewerId, book.getId()));
        dto.setEbookUnlocked(fullAccess);
        dto.setPreviewChapters(VipPerkRules.EBOOK_PREVIEW_CHAPTERS);
        dto.setUnlockPoints(VipPerkRules.EBOOK_UNLOCK_POINTS);

        if (!fullAccess && dto.getChapters() != null) {
            List<BookChapterDto> visible = new ArrayList<>(dto.getChapters().size());
            for (int i = 0; i < dto.getChapters().size(); i++) {
                BookChapterDto chapter = dto.getChapters().get(i);
                visible.add(i < VipPerkRules.EBOOK_PREVIEW_CHAPTERS
                        ? chapter
                        : BookChapterDto.builder()
                                .index(chapter.getIndex())
                                .title(chapter.getTitle())
                                .paragraphs(List.of())
                                .locked(true)
                                .paragraphCount(chapter.getParagraphs() == null ? 0 : chapter.getParagraphs().size())
                                .build());
            }
            dto.setChapters(visible);
        }
        return dto;
    }

    /** Mở khoá cả cuốn: method "points" trừ điểm, "vip" dùng lượt miễn phí trong tuần của VIP. */
    @Transactional
    public UnlockResponse unlock(Long userId, Long bookId, String method) {
        accessGuard.requireUser(userId);
        // Khoá dòng người dùng để hai lần bấm cùng lúc không trừ điểm hay dùng lượt hai lần.
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không tồn tại, vui lòng đăng nhập lại."));
        Book book = bookRepository.findById(bookId)
                .filter(found -> found.getStatus() == Book.Status.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sách."));
        if (!Boolean.TRUE.equals(book.getPremium())) {
            throw ApiException.badRequest("Cuốn này đọc miễn phí, không cần mở khoá.");
        }

        LocalDateTime now = LocalDateTime.now(ZONE);
        if (unlockRepository.existsByUser_IdAndBookId(userId, bookId)) {
            return new UnlockResponse(bookId, true, true, null, 0, weeklyQuota(userId, now));
        }

        String normalized = method == null ? "" : method.trim().toLowerCase(Locale.ROOT);
        EbookUnlock unlock;
        if ("vip".equals(normalized)) {
            VipSubscription vip = subscriptionRepository.findByUserIdForUpdate(userId)
                    .filter(subscription -> isActive(subscription, now))
                    .orElseThrow(() -> ApiException.forbidden(
                            "Nhận ebook miễn phí mỗi tuần chỉ dành cho thành viên VIP."));
            if (remainingThisWeek(vip, userId, now) <= 0) {
                throw ApiException.conflict("Bạn đã dùng hết lượt nhận ebook VIP của tuần này. "
                        + "Lượt mới mở vào thứ Hai.");
            }
            unlock = save(user, bookId, EbookUnlock.SOURCE_VIP_WEEKLY, 0, now);
        } else if ("points".equals(normalized)) {
            pointService.deductPoints(userId, VipPerkRules.EBOOK_UNLOCK_POINTS, "EBOOK_UNLOCK",
                    "ebook-" + bookId, "Mở khoá ebook \"" + book.getTitle() + "\"");
            unlock = save(user, bookId, EbookUnlock.SOURCE_POINTS, VipPerkRules.EBOOK_UNLOCK_POINTS, now);
        } else {
            throw ApiException.badRequest("Cách mở khoá không hợp lệ.");
        }
        return new UnlockResponse(bookId, true, false, unlock.getSource(), unlock.getPointsSpent(),
                weeklyQuota(userId, now));
    }

    @Transactional(readOnly = true)
    public List<UnlockedBook> getUnlocked(Long userId) {
        accessGuard.requireUser(userId);
        return unlockRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(unlock -> new UnlockedBook(unlock.getBookId(), unlock.getSource(),
                        unlock.getPointsSpent(), unlock.getCreatedAt()))
                .toList();
    }

    /** Hạn mức ebook VIP của tuần hiện tại (0 lượt nếu không phải VIP còn hạn). */
    @Transactional(readOnly = true)
    public WeeklyQuota weeklyQuota(Long userId, LocalDateTime now) {
        LocalDateTime weekStart = startOfWeek(now);
        long resetsAt = weekStart.plusDays(7).atZone(ZONE).toInstant().toEpochMilli();
        VipSubscription vip = subscriptionRepository.findByUser_Id(userId)
                .filter(subscription -> isActive(subscription, now))
                .orElse(null);
        long used = unlockRepository.countByUser_IdAndSourceAndCreatedAtGreaterThanEqual(
                userId, EbookUnlock.SOURCE_VIP_WEEKLY, weekStart);
        if (vip == null) {
            return new WeeklyQuota(false, 0, used, 0, resetsAt);
        }
        int limit = Math.max(0, vip.getWeeklyEbooks());
        return new WeeklyQuota(true, limit, used, Math.max(0, limit - used), resetsAt);
    }

    private long remainingThisWeek(VipSubscription vip, Long userId, LocalDateTime now) {
        long used = unlockRepository.countByUser_IdAndSourceAndCreatedAtGreaterThanEqual(
                userId, EbookUnlock.SOURCE_VIP_WEEKLY, startOfWeek(now));
        return Math.max(0, vip.getWeeklyEbooks() - used);
    }

    private EbookUnlock save(User user, Long bookId, String source, int points, LocalDateTime now) {
        return unlockRepository.save(EbookUnlock.builder()
                .user(user)
                .bookId(bookId)
                .source(source)
                .pointsSpent(points)
                .createdAt(now)
                .build());
    }

    private static boolean isActive(VipSubscription subscription, LocalDateTime now) {
        return subscription.getExpiresAt() != null && subscription.getExpiresAt().isAfter(now);
    }

    /** Tuần tính từ 0h thứ Hai theo giờ Việt Nam. */
    private static LocalDateTime startOfWeek(LocalDateTime now) {
        return now.toLocalDate().with(DayOfWeek.MONDAY).atStartOfDay();
    }
}
