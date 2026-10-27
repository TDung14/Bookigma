package com.bookigma.bookigma.vip.service;

import com.bookigma.bookigma.ebook.service.EbookAccessService;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.Voucher;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.reward.dto.RewardDtos.UserVoucherDto;
import com.bookigma.bookigma.reward.entity.UserVoucher;
import com.bookigma.bookigma.reward.repository.UserVoucherRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.NotificationService;
import com.bookigma.bookigma.vip.dto.VipPerkDtos.DailyVoucherStatus;
import com.bookigma.bookigma.vip.dto.VipPerkDtos.PerkRules;
import com.bookigma.bookigma.vip.dto.VipPerkDtos.PerkSummary;
import com.bookigma.bookigma.vip.entity.VipPurchase;
import com.bookigma.bookigma.vip.entity.VipSubscription;
import com.bookigma.bookigma.vip.repository.VipSubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;

/**
 * Các quyền lợi VIP ngoài thời hạn gói: mã giảm giá mua sách, mã gia hạn, voucher hằng ngày,
 * lượt trao đổi sách miễn phí và lượt nhận ebook hằng tuần (xem EbookAccessService).
 */
@Service
public class VipPerkService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final UserVoucherRepository userVoucherRepository;
    private final VipSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final AccessGuard accessGuard;
    private final NotificationService notificationService;
    private final EbookAccessService ebookAccessService;
    private final SecureRandom random = new SecureRandom();

    public VipPerkService(UserVoucherRepository userVoucherRepository,
                          VipSubscriptionRepository subscriptionRepository,
                          UserRepository userRepository,
                          AccessGuard accessGuard,
                          NotificationService notificationService,
                          EbookAccessService ebookAccessService) {
        this.userVoucherRepository = userVoucherRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.accessGuard = accessGuard;
        this.notificationService = notificationService;
        this.ebookAccessService = ebookAccessService;
    }

    // ---------- Phát quyền lợi khi kích hoạt / gia hạn ----------

    /**
     * Gọi trong cùng transaction kích hoạt VIP: phát mã giảm giá mua sách và mã gia hạn theo gói,
     * đồng thời đánh dấu đã dùng mã gia hạn mà đơn VIP này áp dụng (nếu có).
     */
    @Transactional
    public void grantActivationPerks(User user, VipPurchase purchase, VipSubscription subscription) {
        LocalDateTime now = now();
        markRenewalCouponUsed(user.getId(), purchase.getCouponCode(), now);

        int discounts = Math.max(0, purchase.getBookDiscounts());
        for (int i = 0; i < discounts; i++) {
            issue(user, UserVoucher.SOURCE_VIP_PERK,
                    "Voucher VIP: giảm " + VipPerkRules.BOOK_DISCOUNT_PERCENT + "% đơn sách (tối đa 50.000đ)",
                    VipPerkRules.BOOK_DISCOUNT_PERCENT, VipPerkRules.BOOK_DISCOUNT_MAX,
                    subscription.getExpiresAt(), now);
        }
        int renewals = Math.max(0, purchase.getRenewalCodes());
        for (int i = 0; i < renewals; i++) {
            issue(user, UserVoucher.SOURCE_VIP_RENEWAL,
                    "Mã gia hạn VIP: giảm " + VipPerkRules.RENEWAL_DISCOUNT_PERCENT + "% lần mua VIP tiếp theo",
                    VipPerkRules.RENEWAL_DISCOUNT_PERCENT, null,
                    now.plusDays(VipPerkRules.RENEWAL_VALID_DAYS), now);
        }
        if (discounts + renewals > 0) {
            notificationService.createNotification(user.getId(),
                    "Gói " + purchase.getPlanName() + " đã kích hoạt: bạn nhận " + discounts
                            + " voucher mua sách và " + renewals + " mã gia hạn VIP. Xem trong Kho voucher.",
                    "/vouchers");
        }
    }

    // ---------- Mã gia hạn khi mua VIP ----------

    /** Mã gia hạn hợp lệ của người dùng (chưa dùng, còn hạn), chưa đánh dấu đã dùng. */
    @Transactional(readOnly = true)
    public UserVoucher requireRenewalCoupon(Long userId, String code) {
        UserVoucher voucher = userVoucherRepository.findByUser_IdAndCodeIgnoreCase(userId, code)
                .filter(UserVoucher::isVipRenewal)
                .orElseThrow(() -> ApiException.badRequest(
                        "Mã " + code + " không phải mã gia hạn VIP của bạn."));
        if (Boolean.TRUE.equals(voucher.getUsed())) {
            throw ApiException.badRequest("Mã " + voucher.getCode() + " đã được sử dụng.");
        }
        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(now())) {
            throw ApiException.badRequest("Mã " + voucher.getCode() + " đã hết hạn.");
        }
        return voucher;
    }

    /** Số tiền sau khi áp mã gia hạn (làm tròn xuống tới đồng). */
    public static long applyRenewalDiscount(long price, UserVoucher voucher) {
        BigDecimal discount = BigDecimal.valueOf(price).multiply(voucher.getDiscountValue())
                .divide(HUNDRED, 0, RoundingMode.DOWN);
        if (voucher.getMaxDiscount() != null) {
            discount = discount.min(voucher.getMaxDiscount());
        }
        return Math.max(0, price - discount.longValue());
    }

    private void markRenewalCouponUsed(Long userId, String code, LocalDateTime now) {
        if (code == null || code.isBlank()) {
            return;
        }
        userVoucherRepository.findByUser_IdAndCodeIgnoreCase(userId, code)
                .filter(voucher -> !Boolean.TRUE.equals(voucher.getUsed()))
                .ifPresent(voucher -> {
                    voucher.setUsed(true);
                    voucher.setUsedAt(now);
                    userVoucherRepository.save(voucher);
                });
    }

    // ---------- Voucher VIP mỗi ngày ----------

    /** VIP nhận một voucher giảm ngẫu nhiên 10-30% mỗi ngày (theo giờ Việt Nam). */
    @Transactional
    public DailyVoucherStatus claimDailyVoucher(Long userId) {
        accessGuard.requireUser(userId);
        // Khoá dòng người dùng để hai lần bấm cùng lúc không nhận hai voucher.
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không tồn tại, vui lòng đăng nhập lại."));
        LocalDateTime now = now();
        if (activeSubscription(userId, now) == null) {
            throw ApiException.forbidden("Voucher hằng ngày chỉ dành cho thành viên VIP.");
        }
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        if (userVoucherRepository.findFirstByUser_IdAndSourceAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                userId, UserVoucher.SOURCE_VIP_DAILY, startOfDay).isPresent()) {
            throw ApiException.conflict("Hôm nay bạn đã nhận voucher VIP rồi, quay lại vào ngày mai nhé.");
        }

        int percent = VipPerkRules.DAILY_VOUCHER_PERCENTS.get(
                random.nextInt(VipPerkRules.DAILY_VOUCHER_PERCENTS.size()));
        UserVoucher voucher = issue(user, UserVoucher.SOURCE_VIP_DAILY,
                "Voucher VIP hôm nay: giảm " + percent + "% (tối đa 50.000đ)",
                percent, VipPerkRules.DAILY_VOUCHER_MAX_DISCOUNT,
                now.plusDays(VipPerkRules.DAILY_VOUCHER_VALID_DAYS), now);
        return new DailyVoucherStatus(true, UserVoucherDto.from(voucher), nextDay(now));
    }

    // ---------- Lượt trao đổi sách miễn phí ----------

    /** Dùng một lượt trao đổi miễn phí nếu VIP còn hạn và còn lượt. Trả về true nếu đã dùng. */
    @Transactional
    public boolean tryUseFreeSwap(Long userId) {
        LocalDateTime now = now();
        VipSubscription subscription = subscriptionRepository.findByUserIdForUpdate(userId)
                .filter(found -> isActive(found, now))
                .orElse(null);
        if (subscription == null || subscription.getFreeSwaps() <= 0) {
            return false;
        }
        subscription.setFreeSwaps(subscription.getFreeSwaps() - 1);
        subscriptionRepository.save(subscription);
        return true;
    }

    /** Trả lại lượt trao đổi miễn phí khi đề nghị không được chấp nhận. */
    @Transactional
    public void returnFreeSwap(Long userId) {
        subscriptionRepository.findByUserIdForUpdate(userId).ifPresent(subscription -> {
            subscription.setFreeSwaps(subscription.getFreeSwaps() + 1);
            subscriptionRepository.save(subscription);
        });
    }

    // ---------- Tổng hợp ----------

    @Transactional(readOnly = true)
    public PerkSummary getPerks(Long userId) {
        accessGuard.requireUser(userId);
        LocalDateTime now = now();
        VipSubscription vip = activeSubscription(userId, now);

        UserVoucher today = userVoucherRepository
                .findFirstByUser_IdAndSourceAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                        userId, UserVoucher.SOURCE_VIP_DAILY, now.toLocalDate().atStartOfDay())
                .orElse(null);

        return new PerkSummary(
                vip != null,
                vip == null ? null : vip.getPlanName(),
                vip == null ? 0 : vip.getExpiresAt().atZone(ZONE).toInstant().toEpochMilli(),
                rules(),
                ebookAccessService.weeklyQuota(userId, now),
                vip == null ? 0 : Math.max(0, vip.getFreeSwaps()),
                countUsable(userId, UserVoucher.SOURCE_VIP_PERK, now),
                countUsable(userId, UserVoucher.SOURCE_VIP_RENEWAL, now),
                new DailyVoucherStatus(today != null, today == null ? null : UserVoucherDto.from(today), nextDay(now))
        );
    }

    public static PerkRules rules() {
        return new PerkRules(
                VipPerkRules.EXCHANGE_OFFER_FEE,
                VipPerkRules.EBOOK_UNLOCK_POINTS,
                VipPerkRules.EBOOK_PREVIEW_CHAPTERS,
                VipPerkRules.DAILY_VOUCHER_PERCENTS,
                VipPerkRules.DAILY_VOUCHER_MAX_DISCOUNT,
                VipPerkRules.DAILY_VOUCHER_VALID_DAYS,
                VipPerkRules.BOOK_DISCOUNT_PERCENT,
                VipPerkRules.BOOK_DISCOUNT_MAX,
                VipPerkRules.RENEWAL_DISCOUNT_PERCENT,
                VipPerkRules.FREE_AUDIO_RATE_MAX,
                VipPerkRules.VIP_AUDIO_RATE_MAX
        );
    }

    // ---------- Nội bộ ----------

    private UserVoucher issue(User user, String source, String label, int percent, BigDecimal maxDiscount,
                              LocalDateTime expiresAt, LocalDateTime now) {
        return userVoucherRepository.save(UserVoucher.builder()
                .user(user)
                .code(nextCode(source))
                .label(label)
                .discountType(Voucher.DiscountType.PERCENT)
                .discountValue(BigDecimal.valueOf(percent))
                .maxDiscount(maxDiscount)
                .minOrderAmount(BigDecimal.ZERO)
                .expiresAt(expiresAt)
                .used(false)
                .source(source)
                .createdAt(now)
                .build());
    }

    private long countUsable(Long userId, String source, LocalDateTime now) {
        return userVoucherRepository.findByUser_IdAndSourceAndUsedFalse(userId, source).stream()
                .filter(voucher -> voucher.getExpiresAt() == null || voucher.getExpiresAt().isAfter(now))
                .count();
    }

    private VipSubscription activeSubscription(Long userId, LocalDateTime now) {
        return subscriptionRepository.findByUser_Id(userId)
                .filter(subscription -> isActive(subscription, now))
                .orElse(null);
    }

    private static boolean isActive(VipSubscription subscription, LocalDateTime now) {
        return subscription.getExpiresAt() != null && subscription.getExpiresAt().isAfter(now);
    }

    /** Tiền tố theo nguồn để người dùng nhận ra loại mã: VD (hằng ngày), VG (gia hạn), VP (mua sách). */
    private String nextCode(String source) {
        String prefix = switch (source) {
            case UserVoucher.SOURCE_VIP_DAILY -> "VD";
            case UserVoucher.SOURCE_VIP_RENEWAL -> "VG";
            default -> "VP";
        };
        for (int attempt = 0; attempt < 25; attempt++) {
            StringBuilder code = new StringBuilder(prefix);
            for (int i = 0; i < 8; i++) {
                code.append(CODE_CHARS[random.nextInt(CODE_CHARS.length)]);
            }
            if (!userVoucherRepository.existsByCodeIgnoreCase(code.toString())) {
                return code.toString().toUpperCase(Locale.ROOT);
            }
        }
        throw ApiException.conflict("Hệ thống đang bận, vui lòng thử lại.");
    }

    private long nextDay(LocalDateTime now) {
        return now.toLocalDate().plusDays(1).atStartOfDay().atZone(ZONE).toInstant().toEpochMilli();
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }
}
