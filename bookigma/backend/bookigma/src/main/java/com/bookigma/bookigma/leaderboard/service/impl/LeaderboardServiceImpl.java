package com.bookigma.bookigma.leaderboard.service.impl;

import com.bookigma.bookigma.entity.Order;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.UserPoint;
import com.bookigma.bookigma.leaderboard.dto.LeaderboardDtos;
import com.bookigma.bookigma.leaderboard.service.LeaderboardService;
import com.bookigma.bookigma.progress.repository.ReadingProgressRepository;
import com.bookigma.bookigma.repository.OrderRepository;
import com.bookigma.bookigma.repository.UserPointRepository;
import com.bookigma.bookigma.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class LeaderboardServiceImpl implements LeaderboardService {

    private static final int LIMIT = 8;
    private static final List<Order.Status> NOT_COUNTED = List.of(Order.Status.PENDING, Order.Status.CANCELLED);

    private final ReadingProgressRepository progressRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final UserPointRepository userPointRepository;

    public LeaderboardServiceImpl(ReadingProgressRepository progressRepository,
                                  OrderRepository orderRepository,
                                  UserRepository userRepository,
                                  UserPointRepository userPointRepository) {
        this.progressRepository = progressRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.userPointRepository = userPointRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public LeaderboardDtos.LeaderboardDto getLeaderboard() {
        List<ReadingProgressRepository.ReaderAggregate> readerAggregates = progressRepository.aggregateReaders();
        List<OrderRepository.BuyerAggregate> buyerAggregates = orderRepository.aggregateBuyers(NOT_COUNTED);

        Map<Long, User> users = loadUsers(readerAggregates.stream()
                .map(ReadingProgressRepository.ReaderAggregate::getUserId)
                .collect(Collectors.toSet()));
        Map<Long, UserPoint> points = loadPoints(users.keySet());

        List<LeaderboardDtos.ReaderEntry> readers = readerAggregates.stream()
                .filter(row -> isReader(users.get(row.getUserId())))
                .sorted(Comparator
                        .comparingLong((ReadingProgressRepository.ReaderAggregate row) -> value(row.getBooksFinished()))
                        .thenComparingLong(row -> value(row.getSecondsRead()))
                        .reversed())
                .limit(LIMIT)
                .map(row -> toReader(row, users.get(row.getUserId()), points.get(row.getUserId())))
                .toList();

        Map<Long, User> buyerUsers = loadUsers(buyerAggregates.stream()
                .map(OrderRepository.BuyerAggregate::getUserId)
                .collect(Collectors.toSet()));
        Map<Long, UserPoint> buyerPoints = loadPoints(buyerUsers.keySet());

        List<LeaderboardDtos.BuyerEntry> buyers = buyerAggregates.stream()
                .filter(row -> isReader(buyerUsers.get(row.getUserId())))
                .sorted(Comparator.comparing(
                        (OrderRepository.BuyerAggregate row) -> row.getTotalSpent() == null
                                ? BigDecimal.ZERO : row.getTotalSpent()).reversed())
                .limit(LIMIT)
                .map(row -> toBuyer(row, buyerUsers.get(row.getUserId()), buyerPoints.get(row.getUserId())))
                .toList();

        return LeaderboardDtos.LeaderboardDto.builder()
                .readers(readers)
                .buyers(buyers)
                .build();
    }

    private Map<Long, User> loadUsers(java.util.Set<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private Map<Long, UserPoint> loadPoints(java.util.Set<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return userPointRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(UserPoint::getUserId, Function.identity()));
    }

    private boolean isReader(User user) {
        return user != null
                && Boolean.TRUE.equals(user.getActive())
                && user.getRole() == User.Role.USER;
    }

    private long value(Long number) {
        return number == null ? 0 : number;
    }

    private LeaderboardDtos.ReaderEntry toReader(ReadingProgressRepository.ReaderAggregate row,
                                                 User user,
                                                 UserPoint point) {
        return LeaderboardDtos.ReaderEntry.builder()
                .userId(user.getId())
                .name(displayName(user))
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .booksStarted((int) value(row.getBooksStarted()))
                .booksFinished((int) value(row.getBooksFinished()))
                .secondsRead((int) value(row.getSecondsRead()))
                .points(point == null || point.getTotalPoints() == null ? 0 : point.getTotalPoints())
                .streak(user.getStreak() == null ? 0 : user.getStreak())
                .build();
    }

    private LeaderboardDtos.BuyerEntry toBuyer(OrderRepository.BuyerAggregate row,
                                               User user,
                                               UserPoint point) {
        return LeaderboardDtos.BuyerEntry.builder()
                .userId(user.getId())
                .name(displayName(user))
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .orderCount((int) value(row.getOrderCount()))
                .totalSpent(row.getTotalSpent() == null ? BigDecimal.ZERO : row.getTotalSpent())
                .points(point == null || point.getTotalPoints() == null ? 0 : point.getTotalPoints())
                .build();
    }

    private String displayName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
    }
}
