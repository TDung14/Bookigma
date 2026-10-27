package com.bookigma.bookigma.vip.service;

import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.reward.entity.UserVoucher;
import com.bookigma.bookigma.service.PointService;
import com.bookigma.bookigma.vip.dto.VipDtos.BankTransferResult;
import com.bookigma.bookigma.vip.dto.VipDtos.PurchaseResponse;
import com.bookigma.bookigma.vip.dto.VipDtos.SubscriptionResponse;
import com.bookigma.bookigma.vip.entity.VipPurchase;
import com.bookigma.bookigma.vip.entity.VipSubscription;
import com.bookigma.bookigma.vip.repository.VipPurchaseRepository;
import com.bookigma.bookigma.vip.repository.VipSubscriptionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Nguồn xác thực duy nhất cho VIP. Người dùng chỉ tạo đơn PENDING; quyền VIP
 * chỉ được cấp qua webhook ngân hàng hoặc quản trị viên duyệt tay.
 */
@Service
public class VipService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Pattern TRANSFER_CODE_PATTERN = Pattern.compile("VIP[A-Z0-9]{8}");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final VipPurchaseRepository purchaseRepository;
    private final VipSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final PointService pointService;
    private final AccessGuard accessGuard;
    private final VipPerkService vipPerkService;
    private final long purchaseExpiryMinutes;

    public VipService(
            VipPurchaseRepository purchaseRepository,
            VipSubscriptionRepository subscriptionRepository,
            UserRepository userRepository,
            PointService pointService,
            AccessGuard accessGuard,
            VipPerkService vipPerkService,
            @Value("${app.vip.purchase-expiry-minutes:1440}") long purchaseExpiryMinutes
    ) {
        this.purchaseRepository = purchaseRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.pointService = pointService;
        this.accessGuard = accessGuard;
        this.vipPerkService = vipPerkService;
        this.purchaseExpiryMinutes = Math.max(15, purchaseExpiryMinutes);
    }

    @Transactional
    public PurchaseResponse createPurchase(Long userId, String planId, String couponCode) {
        User user = accessGuard.requireUser(userId);
        VipPlan plan = VipPlan.require(planId);
        LocalDateTime now = now();
        String coupon = blankToNull(couponCode) == null ? null : couponCode.trim().toUpperCase(Locale.ROOT);

        Optional<VipPurchase> reusable = purchaseRepository
                .findReusable(user.getId(), plan.id(), coupon, VipPurchase.Status.PENDING, now)
                .stream()
                .findFirst();
        if (reusable.isPresent()) {
            return toPurchaseResponse(reusable.get(), currentSubscription(user.getId(), now));
        }

        // Mã gia hạn giảm % giá gói; chỉ đánh dấu đã dùng khi đơn được xác nhận thanh toán.
        long amount = plan.price();
        if (coupon != null) {
            UserVoucher renewal = vipPerkService.requireRenewalCoupon(user.getId(), coupon);
            if (purchaseRepository.existsByCouponCodeAndStatusAndExpiresAtAfter(
                    coupon, VipPurchase.Status.PENDING, now)) {
                throw ApiException.conflict("Mã " + coupon + " đang gắn với một đơn VIP khác chưa thanh toán.");
            }
            amount = VipPerkService.applyRenewalDiscount(plan.price(), renewal);
        }

        VipPurchase purchase = VipPurchase.builder()
                .user(user)
                .planId(plan.id())
                .planName(plan.name())
                .amount(amount)
                .originalAmount(plan.price())
                .couponCode(coupon)
                .durationDays(plan.days())
                .points(plan.points())
                .pointBonusPercent(plan.pointBonusPercent())
                .extraShelves(plan.extraShelves())
                .weeklyEbooks(plan.weeklyEbooks())
                .bookDiscounts(plan.bookDiscounts())
                .freeSwaps(plan.freeSwaps())
                .renewalCodes(plan.renewalCodes())
                .status(VipPurchase.Status.PENDING)
                .transferCode(nextTransferCode())
                .createdAt(now)
                .expiresAt(now.plusMinutes(purchaseExpiryMinutes))
                .build();

        purchaseRepository.save(purchase);
        return toPurchaseResponse(purchase, currentSubscription(user.getId(), now));
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getMyVip(Long userId) {
        accessGuard.requireUser(userId);
        return toSubscriptionResponse(currentSubscription(userId, now()), now());
    }

    @Transactional
    public PurchaseResponse getMyPurchase(Long userId, Long purchaseId) {
        VipPurchase purchase = requireOwnedPurchase(userId, purchaseId);
        LocalDateTime now = now();
        if (purchase.getStatus() == VipPurchase.Status.PENDING
                && purchase.getExpiresAt().isBefore(now)) {
            purchase.setStatus(VipPurchase.Status.EXPIRED);
            purchase.setNote("Mã thanh toán đã hết hạn.");
            purchaseRepository.save(purchase);
        }
        return toPurchaseResponse(purchase, currentSubscription(userId, now), now);
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponse> getAdminPurchases(Long adminId, String status) {
        accessGuard.requireAdmin(adminId);
        List<VipPurchase> purchases;
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            purchases = purchaseRepository.findAllByOrderByCreatedAtDesc();
        } else {
            VipPurchase.Status parsed;
            try {
                parsed = VipPurchase.Status.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("Trạng thái đơn VIP không hợp lệ.");
            }
            purchases = purchaseRepository.findByStatusOrderByCreatedAtDesc(parsed);
        }
        LocalDateTime now = now();
        return purchases.stream().map(purchase -> toPurchaseResponse(purchase, null, now)).toList();
    }

    @Transactional
    public PurchaseResponse approvePurchase(Long adminId, Long purchaseId, String note, String reference) {
        accessGuard.requireAdmin(adminId);
        VipPurchase purchase = purchaseRepository.findByIdForUpdate(purchaseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn VIP."));

        if (purchase.getStatus() == VipPurchase.Status.PAID) {
            return toPurchaseResponse(purchase, currentSubscription(purchase.getUser().getId(), now()));
        }
        if (purchase.getStatus() == VipPurchase.Status.CANCELLED) {
            throw ApiException.conflict("Đơn VIP đã bị từ chối trước đó.");
        }

        long received = purchase.getReceivedAmount() != null
                ? purchase.getReceivedAmount()
                : purchase.getAmount();
        String adminNote = buildAdminNote(note, reference);
        String providerTransactionId = blankToNull(purchase.getProviderTransactionId());
        if (providerTransactionId == null) {
            providerTransactionId = blankToNull(reference);
        }

        SubscriptionResponse vip = activate(
                purchase,
                adminId,
                "ADMIN",
                providerTransactionId,
                received,
                adminNote
        );
        return toPurchaseResponse(purchase, vip);
    }

    private PurchaseResponse toPurchaseResponse(VipPurchase purchase, SubscriptionResponse vip) {
        return buildPurchaseResponse(purchase, vip);
    }

    @Transactional
    public PurchaseResponse rejectPurchase(Long adminId, Long purchaseId, String note) {
        accessGuard.requireAdmin(adminId);
        VipPurchase purchase = purchaseRepository.findByIdForUpdate(purchaseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn VIP."));

        if (purchase.getStatus() == VipPurchase.Status.PAID) {
            throw ApiException.conflict("Đơn VIP đã được xác nhận, không thể từ chối.");
        }
        if (purchase.getStatus() != VipPurchase.Status.CANCELLED) {
            purchase.setStatus(VipPurchase.Status.CANCELLED);
            purchase.setConfirmedBy(adminId);
            purchase.setNote(note == null || note.isBlank()
                    ? "Quản trị viên từ chối xác nhận chuyển khoản."
                    : note.trim());
            purchaseRepository.save(purchase);
        }
        return toPurchaseResponse(purchase, currentSubscription(purchase.getUser().getId(), now()));
    }

    @Transactional
    public BankTransferResult confirmBankTransfer(
            String content,
            Long receivedAmount,
            String providerTransactionId,
            String provider
    ) {
        if (receivedAmount == null || receivedAmount <= 0) {
            throw ApiException.badRequest("Webhook thiếu số tiền giao dịch.");
        }

        String transferCode = extractTransferCode(content);
        if (transferCode == null) {
            return new BankTransferResult(false, "IGNORED",
                    "Không tìm thấy mã đơn VIP trong nội dung chuyển khoản.", null, null, receivedAmount);
        }

        VipPurchase matched = purchaseRepository.findByTransferCode(transferCode).orElse(null);
        if (matched == null) {
            return new BankTransferResult(false, "IGNORED",
                    "Không có đơn VIP nào khớp mã " + transferCode + ".", null, null, receivedAmount);
        }

        VipPurchase purchase = purchaseRepository.findByIdForUpdate(matched.getId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn VIP."));

        if (purchase.getStatus() == VipPurchase.Status.PAID) {
            return new BankTransferResult(true, "PAID", "Đơn VIP đã được xác nhận trước đó.",
                    purchase.getId(), purchase.getAmount(), purchase.getReceivedAmount());
        }
        if (purchase.getStatus() == VipPurchase.Status.CANCELLED) {
            return new BankTransferResult(true, "CANCELLED", "Đơn VIP đã bị từ chối, không kích hoạt.",
                    purchase.getId(), purchase.getAmount(), receivedAmount);
        }

        if (receivedAmount < purchase.getAmount()) {
            String note = "Đã nhận " + receivedAmount + "đ nhưng đơn cần "
                    + purchase.getAmount() + "đ. Chưa kích hoạt, chờ quản trị viên đối chiếu.";
            purchase.setReceivedAmount(receivedAmount);
            purchase.setProvider(limit(provider, 40));
            purchase.setNote(note);
            if (blankToNull(providerTransactionId) != null
                    && blankToNull(purchase.getProviderTransactionId()) == null) {
                purchase.setProviderTransactionId(limit(providerTransactionId, 120));
            }
            purchaseRepository.save(purchase);
            return new BankTransferResult(true, "AMOUNT_MISMATCH", note,
                    purchase.getId(), purchase.getAmount(), receivedAmount);
        }

        activate(
                purchase,
                null,
                blankToNull(provider) == null ? "BANK_WEBHOOK" : limit(provider, 40),
                blankToNull(providerTransactionId),
                receivedAmount,
                "Ngân hàng xác nhận chuyển khoản cho mã " + transferCode + "."
        );
        return new BankTransferResult(true, "PAID", "Đã xác nhận thanh toán và kích hoạt VIP.",
                purchase.getId(), purchase.getAmount(), receivedAmount);
    }

    public static String extractTransferCode(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String normalized = content.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        Matcher matcher = TRANSFER_CODE_PATTERN.matcher(normalized);
        return matcher.find() ? matcher.group() : null;
    }

    private SubscriptionResponse activate(
            VipPurchase purchase,
            Long confirmedBy,
            String provider,
            String providerTransactionId,
            long receivedAmount,
            String note
    ) {
        Long userId = purchase.getUser().getId();
        User lockedUser = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản của đơn VIP."));

        String txId = blankToNull(providerTransactionId);
        if (txId != null) {
            purchaseRepository.findByProviderTransactionId(txId)
                    .filter(other -> !other.getId().equals(purchase.getId()))
                    .ifPresent(other -> {
                        throw ApiException.conflict("Mã giao dịch ngân hàng đã dùng cho đơn VIP khác.");
                    });
        }

        LocalDateTime now = now();
        VipSubscription subscription = subscriptionRepository.findByUser_Id(lockedUser.getId())
                .orElseGet(() -> VipSubscription.builder()
                        .user(lockedUser)
                        .expiresAt(now)
                        .startedAt(now)
                        .build());

        boolean wasActive = subscription.getExpiresAt() != null
                && subscription.getExpiresAt().isAfter(now);

        if (wasActive) {
            subscription.setExpiresAt(subscription.getExpiresAt().plusDays(purchase.getDurationDays()));
            subscription.setExtraShelves(subscription.getExtraShelves() + purchase.getExtraShelves());
            subscription.setBookDiscounts(subscription.getBookDiscounts() + purchase.getBookDiscounts());
            subscription.setFreeSwaps(subscription.getFreeSwaps() + purchase.getFreeSwaps());
            subscription.setRenewalCodes(subscription.getRenewalCodes() + purchase.getRenewalCodes());
            subscription.setPointBonusPercent(Math.max(
                    subscription.getPointBonusPercent(), purchase.getPointBonusPercent()));
            subscription.setWeeklyEbooks(Math.max(
                    subscription.getWeeklyEbooks(), purchase.getWeeklyEbooks()));
        } else {
            subscription.setStartedAt(now);
            subscription.setExpiresAt(now.plusDays(purchase.getDurationDays()));
            subscription.setExtraShelves(purchase.getExtraShelves());
            subscription.setBookDiscounts(purchase.getBookDiscounts());
            subscription.setFreeSwaps(purchase.getFreeSwaps());
            subscription.setRenewalCodes(purchase.getRenewalCodes());
            subscription.setPointBonusPercent(purchase.getPointBonusPercent());
            subscription.setWeeklyEbooks(purchase.getWeeklyEbooks());
        }

        subscription.setPlanId(purchase.getPlanId());
        subscription.setPlanName(purchase.getPlanName());
        subscription.setPrice(purchase.getAmount());
        subscription.setMusicUnlocked(true);
        subscriptionRepository.save(subscription);

        purchase.setStatus(VipPurchase.Status.PAID);
        purchase.setPaidAt(now);
        purchase.setConfirmedBy(confirmedBy);
        purchase.setProvider(limit(provider, 40));
        purchase.setProviderTransactionId(txId);
        purchase.setReceivedAmount(receivedAmount);
        purchase.setNote(note);
        purchaseRepository.save(purchase);

        pointService.addPoints(
                userId,
                purchase.getPoints(),
                "VIP_PURCHASE",
                "vip-purchase-" + purchase.getId(),
                "Nâng cấp " + purchase.getPlanName()
        );

        // Mã giảm giá mua sách + mã gia hạn theo gói, và đánh dấu mã gia hạn đã áp cho đơn này
        vipPerkService.grantActivationPerks(lockedUser, purchase, subscription);

        return toSubscriptionResponse(subscription, now);
    }

    private VipPurchase requireOwnedPurchase(Long userId, Long purchaseId) {
        accessGuard.requireUser(userId);
        VipPurchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn VIP."));
        if (!purchase.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Bạn không có quyền xem đơn VIP này.");
        }
        return purchase;
    }

    private VipSubscription currentSubscription(Long userId, LocalDateTime now) {
        return subscriptionRepository.findByUser_Id(userId).orElse(null);
    }

    private String nextTransferCode() {
        for (int attempt = 0; attempt < 25; attempt++) {
            StringBuilder code = new StringBuilder("VIP");
            for (int i = 0; i < 8; i++) {
                code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            String value = code.toString();
            if (!purchaseRepository.existsByTransferCode(value)) {
                return value;
            }
        }
        throw new IllegalStateException("Không tạo được mã chuyển khoản VIP duy nhất.");
    }

    private PurchaseResponse toPurchaseResponse(VipPurchase purchase, VipSubscription subscription) {
        return toPurchaseResponse(purchase, subscription, now());
    }

    private PurchaseResponse toPurchaseResponse(
            VipPurchase purchase,
            VipSubscription subscription,
            LocalDateTime now
    ) {
        SubscriptionResponse vip = subscription == null
                ? toSubscriptionResponse(null, now)
                : toSubscriptionResponse(subscription, now);
        return buildPurchaseResponse(purchase, vip);
    }

    private PurchaseResponse buildPurchaseResponse(VipPurchase purchase, SubscriptionResponse vip) {
        User owner = purchase.getUser();
        return new PurchaseResponse(
                purchase.getId(),
                owner.getId(),
                owner.getUsername(),
                owner.getFullName(),
                owner.getEmail(),
                purchase.getPlanId(),
                purchase.getPlanName(),
                purchase.getAmount(),
                purchase.getDurationDays(),
                purchase.getPoints(),
                purchase.getExtraShelves(),
                purchase.getStatus().name(),
                purchase.getTransferCode(),
                purchase.getTransferCode(),
                purchase.getProvider(),
                purchase.getProviderTransactionId(),
                purchase.getReceivedAmount(),
                purchase.getCreatedAt(),
                purchase.getExpiresAt(),
                purchase.getPaidAt(),
                purchase.getNote(),
                vip,
                purchase.getOriginalAmount() == null ? purchase.getAmount() : purchase.getOriginalAmount(),
                purchase.getCouponCode()
        );
    }

    private SubscriptionResponse toSubscriptionResponse(VipSubscription subscription, LocalDateTime now) {
        if (subscription == null) {
            return new SubscriptionResponse(false, null, null, 0, 0, 0, 0,
                    0, 0, 0, 0, 0, 0, false);
        }
        boolean active = subscription.getExpiresAt() != null && subscription.getExpiresAt().isAfter(now);
        long daysLeft = 0;
        if (active) {
            long seconds = Duration.between(now, subscription.getExpiresAt()).getSeconds();
            daysLeft = Math.max(1, (long) Math.ceil(seconds / 86400.0));
        }
        return new SubscriptionResponse(
                active,
                subscription.getPlanId(),
                subscription.getPlanName(),
                subscription.getPrice(),
                toEpochMs(subscription.getStartedAt()),
                toEpochMs(subscription.getExpiresAt()),
                daysLeft,
                subscription.getExtraShelves(),
                subscription.getPointBonusPercent(),
                subscription.getWeeklyEbooks(),
                subscription.getBookDiscounts(),
                subscription.getFreeSwaps(),
                subscription.getRenewalCodes(),
                subscription.isMusicUnlocked()
        );
    }

    private long toEpochMs(LocalDateTime value) {
        return value == null ? 0 : value.atZone(ZONE).toInstant().toEpochMilli();
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    private String buildAdminNote(String note, String reference) {
        String base = note == null || note.isBlank()
                ? "Quản trị viên đối chiếu sao kê và xác nhận chuyển khoản."
                : note.trim();
        if (reference != null && !reference.isBlank()) {
            return limit(base + " Mã giao dịch: " + reference.trim(), 500);
        }
        return limit(base, 500);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String limit(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
