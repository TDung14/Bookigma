package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.dto.UserPointsSummaryDto;
import com.bookigma.bookigma.entity.UserPoint;

import java.util.List;

public interface PointService {
    UserPointsSummaryDto getPointsSummary(Long userId);
    List<PointTransactionDto> getPointsHistory(Long userId);
    UserPoint getOrCreateUserPoint(Long userId);
    PointTransactionDto addPoints(Long userId, int amount, String type, String referenceId, String description);
    PointTransactionDto deductPoints(Long userId, int amount, String type, String referenceId, String description);
    PointTransactionDto dailyCheckIn(Long userId);
}
