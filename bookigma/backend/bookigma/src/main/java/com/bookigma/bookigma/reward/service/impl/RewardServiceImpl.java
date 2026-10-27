package com.bookigma.bookigma.reward.service.impl;

import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.Voucher;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.reward.dto.RewardDtos;
import com.bookigma.bookigma.reward.entity.RewardRedemption;
import com.bookigma.bookigma.reward.entity.UserVoucher;
import com.bookigma.bookigma.reward.repository.RewardRedemptionRepository;
import com.bookigma.bookigma.reward.repository.UserVoucherRepository;
import com.bookigma.bookigma.reward.service.RewardItem;
import com.bookigma.bookigma.reward.service.RewardService;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.PointService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;

@Service
public class RewardServiceImpl implements RewardService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int VOUCHER_VALID_DAYS = 30;
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final UserRepository userRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final RewardRedemptionRepository redemptionRepository;
    private final PointService pointService;
    private final AccessGuard accessGuard;
    private final SecureRandom secureRandom = new SecureRandom();

    public RewardServiceImpl(UserRepository userRepository,
                             UserVoucherRepository userVoucherRepository,
                             RewardRedemptionRepository redemptionRepository,
                             PointService pointService,
                             AccessGuard accessGuard) {
        this.userRepository = userRepository;
        this.userVoucherRepository = userVoucherRepository;
        this.redemptionRepository = redemptionRepository;
        this.pointService = pointService;
        this.accessGuard = accessGuard;
    }

    @Override
    public List<RewardDtos.RewardDto> getCatalog() {
        return Arrays.stream(RewardItem.values())
                .map(item -> RewardDtos.RewardDto.builder()
                        .id(item.id())
                        .emoji(item.emoji())
                        .name(item.title())
                        .desc(item.description())
                        .cost(item.cost())
                        .type(item.type().name().toLowerCase())
                        .value(item.value())
                        .minOrder(item.minOrder())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardDtos.RedemptionDto> getRedemptions(Long userId) {
        accessGuard.requireUser(userId);
        return redemptionRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardDtos.UserVoucherDto> getAvailableVouchers(Long userId) {
        accessGuard.requireUser(userId);
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        return userVoucherRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .filter(voucher -> !Boolean.TRUE.equals(voucher.getUsed()))
                .filter(voucher -> voucher.getExpiresAt() == null || voucher.getExpiresAt().isAfter(now))
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public RewardDtos.RedeemResponse redeem(Long userId, String rewardId) {
        RewardItem item = RewardItem.find(rewardId)
                .orElseThrow(() -> ApiException.badRequest("Phần thưởng không tồn tại."));
        accessGuard.requireUser(userId);
        // Khóa dòng người dùng để hai lần bấm đổi thưởng cùng lúc không thể tiêu quá số điểm hiện có.
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không tồn tại, vui lòng đăng nhập lại."));

        PointTransactionDto tx = pointService.deductPoints(
                userId,
                item.cost(),
                "REWARD_REDEEM",
                item.id(),
                "Đổi thưởng: " + item.title()
        );

        UserVoucher voucher = null;
        RewardRedemption.Type type = item.type() == RewardItem.RewardRedemptionType.VOUCHER
                ? RewardRedemption.Type.VOUCHER
                : RewardRedemption.Type.PHYSICAL;

        if (type == RewardRedemption.Type.VOUCHER) {
            voucher = userVoucherRepository.save(UserVoucher.builder()
                    .user(user)
                    .code(generateVoucherCode())
                    .label(item.title() + " — hạn dùng " + VOUCHER_VALID_DAYS + " ngày")
                    .discountType(Voucher.DiscountType.AMOUNT)
                    .discountValue(BigDecimal.valueOf(item.value()))
                    .minOrderAmount(BigDecimal.valueOf(item.minOrder() == null ? 0 : item.minOrder()))
                    .expiresAt(LocalDateTime.now(VN_ZONE).plusDays(VOUCHER_VALID_DAYS))
                    .used(false)
                    .build());
        }

        RewardRedemption redemption = redemptionRepository.save(RewardRedemption.builder()
                .user(user)
                .rewardId(item.id())
                .rewardName(item.title())
                .cost(item.cost())
                .type(type)
                .status(type == RewardRedemption.Type.VOUCHER
                        ? RewardRedemption.Status.ISSUED
                        : RewardRedemption.Status.PENDING)
                .voucherCode(voucher == null ? null : voucher.getCode())
                .build());

        return RewardDtos.RedeemResponse.builder()
                .redemption(toDto(redemption))
                .voucher(voucher == null ? null : toDto(voucher))
                .balanceAfter(tx.getBalanceAfter())
                .build();
    }

    private String generateVoucherCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder code = new StringBuilder("BKG");
            for (int i = 0; i < 6; i++) {
                code.append(CODE_CHARS[secureRandom.nextInt(CODE_CHARS.length)]);
            }
            if (!userVoucherRepository.existsByCodeIgnoreCase(code.toString())) {
                return code.toString();
            }
        }
        throw ApiException.conflict("Hệ thống đang bận, vui lòng thử đổi thưởng lại.");
    }

    private RewardDtos.RedemptionDto toDto(RewardRedemption redemption) {
        return RewardDtos.RedemptionDto.builder()
                .id(redemption.getId())
                .rewardId(redemption.getRewardId())
                .name(redemption.getRewardName())
                .cost(redemption.getCost())
                .type(redemption.getType().name().toLowerCase())
                .status(redemption.getStatus().name().toLowerCase())
                .voucherCode(redemption.getVoucherCode())
                .createdAt(redemption.getCreatedAt())
                .build();
    }

    private RewardDtos.UserVoucherDto toDto(UserVoucher voucher) {
        return RewardDtos.UserVoucherDto.from(voucher);
    }
}
