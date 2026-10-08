package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.dto.UserPointsSummaryDto;
import com.bookigma.bookigma.entity.PointTransaction;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.UserPoint;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.PointTransactionRepository;
import com.bookigma.bookigma.repository.UserPointRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.PointService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class PointServiceImpl implements PointService {

    private final UserPointRepository userPointRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final AccessGuard accessGuard;

    public PointServiceImpl(UserPointRepository userPointRepository,
                            PointTransactionRepository pointTransactionRepository,
                            AccessGuard accessGuard) {
        this.userPointRepository = userPointRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public UserPointsSummaryDto getPointsSummary(Long userId) {
        accessGuard.requireUser(userId);
        UserPoint userPoint = getOrCreateUserPoint(userId);
        
        List<PointTransaction> recent = pointTransactionRepository.findByUser_IdOrderByCreatedAtDesc(
                userId, PageRequest.of(0, 10));

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        boolean checkedInToday = pointTransactionRepository.existsByUser_IdAndTypeAndCreatedAtAfter(
                userId, "DAILY_CHECKIN", startOfDay);

        String nextTier = getNextTier(userPoint.getMonthlyPoints());
        int pointsToNext = getPointsToNextTier(userPoint.getMonthlyPoints());

        return UserPointsSummaryDto.builder()
                .userId(userId)
                .balance(userPoint.getTotalPoints())
                .lifetimePoints(userPoint.getMonthlyPoints()) // Total accumulated points
                .currentTier(userPoint.getCurrentTier())
                .nextTier(nextTier)
                .pointsToNextTier(pointsToNext)
                .checkedInToday(checkedInToday)
                .recentTransactions(recent.stream().map(this::toDto).toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PointTransactionDto> getPointsHistory(Long userId) {
        accessGuard.requireUser(userId);
        return pointTransactionRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public UserPoint getOrCreateUserPoint(Long userId) {
        User user = accessGuard.requireUser(userId);
        return userPointRepository.findByUserId(userId)
                .orElseGet(() -> userPointRepository.save(UserPoint.builder()
                        .user(user)
                        .totalPoints(0)
                        .monthlyPoints(0)
                        .currentTier("Tập Sự")
                        .build()));
    }

    @Override
    @Transactional
    public PointTransactionDto addPoints(Long userId, int amount, String type, String referenceId, String description) {
        if (amount <= 0) {
            throw ApiException.badRequest("Số điểm cộng phải lớn hơn 0");
        }
        UserPoint userPoint = getOrCreateUserPoint(userId);
        userPoint.setTotalPoints(userPoint.getTotalPoints() + amount);
        userPoint.setMonthlyPoints(userPoint.getMonthlyPoints() + amount);
        userPoint.setCurrentTier(UserPoint.calculateTier(userPoint.getMonthlyPoints()));
        userPointRepository.save(userPoint);

        PointTransaction tx = PointTransaction.builder()
                .user(userPoint.getUser())
                .amount(amount)
                .balanceAfter(userPoint.getTotalPoints())
                .type(type)
                .referenceId(referenceId)
                .description(description)
                .build();

        return toDto(pointTransactionRepository.save(tx));
    }

    @Override
    @Transactional
    public PointTransactionDto deductPoints(Long userId, int amount, String type, String referenceId, String description) {
        if (amount <= 0) {
            throw ApiException.badRequest("Số điểm trừ phải lớn hơn 0");
        }
        UserPoint userPoint = getOrCreateUserPoint(userId);
        if (userPoint.getTotalPoints() < amount) {
            throw ApiException.badRequest("Số dư Điểm Bookigma không đủ (Số dư hiện tại: " + userPoint.getTotalPoints() + " Điểm)");
        }
        userPoint.setTotalPoints(userPoint.getTotalPoints() - amount);
        userPointRepository.save(userPoint);

        PointTransaction tx = PointTransaction.builder()
                .user(userPoint.getUser())
                .amount(-amount)
                .balanceAfter(userPoint.getTotalPoints())
                .type(type)
                .referenceId(referenceId)
                .description(description)
                .build();

        return toDto(pointTransactionRepository.save(tx));
    }

    @Override
    @Transactional
    public PointTransactionDto dailyCheckIn(Long userId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        boolean alreadyCheckedIn = pointTransactionRepository.existsByUser_IdAndTypeAndCreatedAtAfter(
                userId, "DAILY_CHECKIN", startOfDay);

        if (alreadyCheckedIn) {
            throw ApiException.conflict("Bạn đã điểm danh nhận điểm hôm nay rồi!");
        }

        int rewardPoints = 50; // 50 Điểm / ngày
        return addPoints(userId, rewardPoints, "DAILY_CHECKIN", LocalDate.now().toString(), "Điểm danh nhận Điểm hàng ngày");
    }

    private String getNextTier(int points) {
        if (points < 1000) return "Độc Giả Thân Thiết";
        if (points < 5000) return "Mọt Sách VIP";
        if (points < 10000) return "Đại Sứ Sách";
        return "Tối Đa (Max Tier)";
    }

    private int getPointsToNextTier(int points) {
        if (points < 1000) return 1000 - points;
        if (points < 5000) return 5000 - points;
        if (points < 10000) return 10000 - points;
        return 0;
    }

    private PointTransactionDto toDto(PointTransaction tx) {
        return PointTransactionDto.builder()
                .id(tx.getId())
                .amount(tx.getAmount())
                .balanceAfter(tx.getBalanceAfter())
                .type(tx.getType())
                .referenceId(tx.getReferenceId())
                .description(tx.getDescription())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
