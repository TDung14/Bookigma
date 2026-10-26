package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.CheckoutRequestDto;
import com.bookigma.bookigma.dto.OrderItemResponseDto;
import com.bookigma.bookigma.dto.OrderResponseDto;
import com.bookigma.bookigma.dto.OrderTimelineDto;
import com.bookigma.bookigma.dto.PointTransactionDto;
import com.bookigma.bookigma.dto.StatusUpdateRequestDto;
import com.bookigma.bookigma.entity.BlindBox;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.CartItem;
import com.bookigma.bookigma.entity.Order;
import com.bookigma.bookigma.entity.OrderItem;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.Voucher;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.CartItemRepository;
import com.bookigma.bookigma.repository.OrderRepository;
import com.bookigma.bookigma.repository.VoucherRepository;
import com.bookigma.bookigma.reward.entity.UserVoucher;
import com.bookigma.bookigma.reward.repository.UserVoucherRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.DtoMapper;
import com.bookigma.bookigma.service.InputUtils;
import com.bookigma.bookigma.service.NotificationService;
import com.bookigma.bookigma.service.OrderPricing;
import com.bookigma.bookigma.service.OrderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class OrderServiceImpl implements OrderService {
    /** Người mua không được thấy sách trong hộp Blind Book chưa mở; shop và admin thì cần thấy để giao hàng. */
    private enum Viewer { BUYER, STAFF }

    private static final int ORDER_REWARD_POINTS = 50;
    private static final String ORDER_REWARD_TYPE = "ORDER_COMPLETED";
    /** Đơn cũ từng được cộng điểm ngay lúc đặt hàng. */
    private static final String LEGACY_ORDER_REWARD_TYPE = "ORDER_PLACED";

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final BookRepository bookRepository;
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final AccessGuard accessGuard;
    private final NotificationService notificationService;
    private final com.bookigma.bookigma.service.PointService pointService;

    @Value("${app.orders.unpaid-expiry-hours:24}")
    private long unpaidExpiryHours;

    public OrderServiceImpl(OrderRepository orderRepository,
                            CartItemRepository cartItemRepository,
                            BookRepository bookRepository,
                            VoucherRepository voucherRepository,
                            UserVoucherRepository userVoucherRepository,
                            AccessGuard accessGuard,
                            NotificationService notificationService,
                            com.bookigma.bookigma.service.PointService pointService) {
        this.orderRepository = orderRepository;
        this.cartItemRepository = cartItemRepository;
        this.bookRepository = bookRepository;
        this.voucherRepository = voucherRepository;
        this.userVoucherRepository = userVoucherRepository;
        this.accessGuard = accessGuard;
        this.notificationService = notificationService;
        this.pointService = pointService;
    }

    // ---------- Người mua ----------

    @Override
    @Transactional
    public List<OrderResponseDto> checkout(Long userId, CheckoutRequestDto request) {
        User buyer = accessGuard.requireUser(userId);
        Order.PaymentMethod paymentMethod = InputUtils.parseEnum(
                Order.PaymentMethod.class, request.getPaymentMethod(), "Phương thức thanh toán không hợp lệ.");

        List<CartItem> cart = cartItemRepository.findByUserIdOrderByCreatedAtAscIdAsc(userId);
        if (cart.isEmpty()) {
            throw ApiException.badRequest("Giỏ hàng của bạn đang trống.");
        }

        List<Parcel> parcels = splitIntoParcels(cart);
        List<BigDecimal> subtotals = parcels.stream().map(Parcel::subtotal).toList();
        BigDecimal subtotal = subtotals.stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        AppliedVoucher voucher = resolveVoucher(userId, request.getVoucherCode(), subtotal);
        List<BigDecimal> discounts = new ArrayList<>(OrderPricing.allocate(
                OrderPricing.discountFor(voucher.discountType(), voucher.discountValue(), voucher.maxDiscount(), subtotal),
                subtotals));
        boolean freeShipping = voucher.discountType() == Voucher.DiscountType.SHIPPING;

        // 1 điểm = 1đ, chỉ trừ vào tiền hàng còn lại sau voucher (không trừ phí ship) và không trừ quá số đó
        List<Integer> pointsPerOrder = new ArrayList<>(parcels.stream().map(parcel -> 0).toList());
        Integer pointsToUse = request.getPointsToUse();
        if (pointsToUse != null && pointsToUse > 0) {
            List<BigDecimal> payable = new ArrayList<>();
            for (int i = 0; i < subtotals.size(); i++) {
                payable.add(subtotals.get(i).subtract(discounts.get(i)).max(BigDecimal.ZERO));
            }
            BigDecimal payableTotal = payable.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal usable = BigDecimal.valueOf(pointsToUse).min(payableTotal).setScale(0, RoundingMode.DOWN);
            List<BigDecimal> shares = OrderPricing.allocate(usable, payable);
            int used = 0;
            for (int i = 0; i < shares.size(); i++) {
                int share = shares.get(i).setScale(0, RoundingMode.DOWN).intValue();
                pointsPerOrder.set(i, share);
                discounts.set(i, discounts.get(i).add(BigDecimal.valueOf(share)));
                used += share;
            }
            if (used > 0) {
                pointService.deductPoints(buyer.getId(), used, "ORDER_DISCOUNT", "CHECKOUT", "Dùng Điểm Bookigma giảm giá đơn hàng");
            }
        }

        List<Order> orders = new ArrayList<>();
        for (int i = 0; i < parcels.size(); i++) {
            Parcel parcel = parcels.get(i);
            BigDecimal shippingFee = freeShipping ? BigDecimal.ZERO : OrderPricing.SHIPPING_FEE_PER_ORDER;
            BigDecimal discount = discounts.get(i);

            Order order = Order.builder()
                    .code(generateOrderCode())
                    .user(buyer)
                    .shop(parcel.shop)
                    .recipientName(request.getRecipientName().trim())
                    .recipientPhone(request.getRecipientPhone().trim())
                    .shippingAddress(request.getShippingAddress().trim())
                    .note(InputUtils.blankToNull(request.getNote()))
                    .paymentMethod(paymentMethod)
                    .voucherCode(voucher.code())
                    .subtotal(money(subtotals.get(i)))
                    .shippingFee(money(shippingFee))
                    .discountAmount(money(discount))
                    .pointsUsed(pointsPerOrder.get(i))
                    .totalAmount(money(subtotals.get(i).subtract(discount).add(shippingFee).max(BigDecimal.ZERO)))
                    .status(Order.Status.PENDING)
                    .paymentExpiresAt(paymentMethod.isPrepaid()
                            ? LocalDateTime.now().plusHours(unpaidExpiryHours)
                            : null)
                    .build();

            for (CartItem line : parcel.lines) {
                order.addItem(line.isBlindBox() ? takeBlindBox(line.getBlindBox()) : takeBook(line));
            }
            order.addHistory(Order.Status.PENDING, "Đơn hàng được tạo");
            orders.add(orderRepository.save(order));
        }

        cartItemRepository.deleteAll(cart);

        // Voucher đổi bằng điểm chỉ dùng một lần, áp cho toàn bộ các đơn tách ra từ lần thanh toán này.
        if (voucher.personal() != null && !orders.isEmpty()) {
            UserVoucher personal = voucher.personal();
            personal.setUsed(true);
            personal.setUsedAt(LocalDateTime.now());
            personal.setOrderId(orders.get(0).getId());
            userVoucherRepository.save(personal);
        }

        for (Order order : orders) {
            notificationService.createNotification(buyer.getId(),
                    "Đơn hàng " + order.getCode() + " đã được tạo và đang chờ shop xác nhận. "
                            + "Bạn sẽ được cộng Điểm Bookigma khi đơn hoàn tất.",
                    "/orders/" + order.getId());
            notifyShop(order, "Bạn có đơn hàng mới " + order.getCode() + " đang chờ xác nhận.");
        }
        return orders.stream().map(order -> toDto(order, Viewer.BUYER)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDto> getMyOrders(Long userId) {
        accessGuard.requireUser(userId);
        return orderRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(order -> toDto(order, Viewer.BUYER))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponseDto getMyOrder(Long userId, Long orderId) {
        return toDto(findBuyerOrder(userId, orderId), Viewer.BUYER);
    }

    @Override
    @Transactional
    public OrderResponseDto cancelMyOrder(Long userId, Long orderId, String reason) {
        Order order = findBuyerOrder(userId, orderId);
        if (order.getStatus() != Order.Status.PENDING && order.getStatus() != Order.Status.CONFIRMED) {
            throw ApiException.conflict("Chỉ hủy được đơn chưa được giao cho đơn vị vận chuyển.");
        }
        String cleanReason = InputUtils.blankToNull(reason);
        changeStatus(order, Order.Status.CANCELLED,
                cleanReason == null ? "Khách hàng hủy đơn" : "Khách hàng hủy đơn: " + cleanReason);
        notifyShop(order, "Khách hàng đã hủy đơn " + order.getCode() + "."
                + (order.getPaidAt() != null ? " Đơn đã thanh toán, hãy hoàn tiền cho khách." : ""));
        return toDto(order, Viewer.BUYER);
    }

    @Override
    @Transactional
    public OrderResponseDto completeMyOrder(Long userId, Long orderId) {
        Order order = findBuyerOrder(userId, orderId);
        if (order.getStatus() != Order.Status.DELIVERED) {
            throw ApiException.conflict("Chỉ xác nhận đã nhận hàng khi đơn ở trạng thái Đã giao.");
        }
        changeStatus(order, Order.Status.COMPLETED, "Khách xác nhận đã nhận hàng");
        notifyShop(order, "Đơn " + order.getCode() + " đã hoàn thành — khách xác nhận đã nhận hàng.");
        return toDto(order, Viewer.BUYER);
    }

    @Override
    @Transactional
    public OrderResponseDto revealBlindBox(Long userId, Long orderId, Long itemId) {
        Order order = findBuyerOrder(userId, orderId);
        OrderItem item = order.getItems().stream()
                .filter(candidate -> candidate.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm trong đơn hàng."));
        BlindBox box = item.getBlindBox();
        if (box == null) {
            throw ApiException.badRequest("Sản phẩm này không phải hộp Blind Book.");
        }
        if (order.getStatus() != Order.Status.DELIVERED && order.getStatus() != Order.Status.COMPLETED) {
            throw ApiException.conflict("Hộp chỉ mở được sau khi đơn hàng đã giao tới bạn.");
        }
        if (box.getRevealedAt() == null) {
            box.setRevealedAt(LocalDateTime.now());
        }
        return toDto(order, Viewer.BUYER);
    }

    // ---------- Kênh người bán ----------

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDto> getShopOrders(Long userId) {
        Shop shop = accessGuard.requireOwnShop(userId);
        return orderRepository.findByShop_IdOrderByCreatedAtDesc(shop.getId()).stream()
                .map(order -> toDto(order, Viewer.STAFF))
                .toList();
    }

    @Override
    @Transactional
    public OrderResponseDto updateShopOrderStatus(Long userId, Long orderId, StatusUpdateRequestDto request) {
        Order order = findShopOrder(userId, orderId);

        Order.Status next = InputUtils.parseEnum(Order.Status.class, request.getStatus(),
                "Trạng thái đơn hàng không hợp lệ.");
        // Shop được xác nhận, giao hàng hoặc hủy đơn trước khi bàn giao vận chuyển. Hoàn thành là việc của người mua.
        boolean allowedForShop = switch (next) {
            case CONFIRMED, SHIPPING, DELIVERED -> true;
            case CANCELLED -> order.getStatus() == Order.Status.PENDING || order.getStatus() == Order.Status.CONFIRMED;
            case PENDING, COMPLETED -> false;
        };
        if (!allowedForShop || !order.getStatus().canMoveTo(next)) {
            throw ApiException.conflict("Không thể chuyển đơn từ \"" + order.getStatus().getLabel()
                    + "\" sang \"" + next.getLabel() + "\".");
        }
        if (next == Order.Status.SHIPPING && order.getPaymentMethod().isPrepaid() && order.getPaidAt() == null) {
            throw ApiException.conflict("Đơn " + order.getCode()
                    + " thanh toán bằng mã QR nhưng chưa xác nhận nhận tiền, chưa thể giao hàng.");
        }

        String note = InputUtils.blankToNull(request.getNote());
        // Tính lời nhắn trước khi đổi trạng thái để còn phân biệt đơn bị từ chối hay đơn đã xác nhận bị hủy.
        String message = buyerMessage(order, next, note);
        changeStatus(order, next, note == null ? defaultShopNote(order, next) : note);
        notificationService.createNotification(order.getUser().getId(), message, "/orders/" + order.getId());
        return toDto(order, Viewer.STAFF);
    }

    @Override
    @Transactional
    public OrderResponseDto confirmShopOrderPayment(Long userId, Long orderId) {
        Order order = findShopOrder(userId, orderId);
        if (!order.getPaymentMethod().isPrepaid()) {
            throw ApiException.badRequest("Đơn COD được thanh toán khi giao hàng, không cần xác nhận nhận tiền.");
        }
        if (order.getStatus() == Order.Status.CANCELLED) {
            throw ApiException.conflict("Đơn đã hủy, không thể xác nhận thanh toán.");
        }
        if (order.getPaidAt() != null) {
            throw ApiException.conflict("Đơn " + order.getCode() + " đã được xác nhận thanh toán.");
        }

        order.setPaidAt(LocalDateTime.now());
        order.addHistory(order.getStatus(), "Shop xác nhận đã nhận "
                + DtoMapper.formatVnd(order.getTotalAmount()) + " qua mã QR");
        notificationService.createNotification(order.getUser().getId(),
                "Shop đã nhận được thanh toán cho đơn " + order.getCode() + ".", "/orders/" + order.getId());
        return toDto(order, Viewer.STAFF);
    }

    @Override
    @Transactional
    public OrderResponseDto confirmShopOrderRefund(Long userId, Long orderId) {
        Order order = findShopOrder(userId, orderId);
        if (order.getStatus() != Order.Status.CANCELLED) {
            throw ApiException.conflict("Chỉ xác nhận hoàn tiền cho đơn đã hủy.");
        }
        if (order.getPaidAt() == null) {
            throw ApiException.badRequest("Đơn " + order.getCode() + " chưa thanh toán, không cần hoàn tiền.");
        }
        if (order.getRefundedAt() != null) {
            throw ApiException.conflict("Đơn " + order.getCode() + " đã được xác nhận hoàn tiền.");
        }

        order.setRefundedAt(LocalDateTime.now());
        order.addHistory(Order.Status.CANCELLED,
                "Shop đã hoàn " + DtoMapper.formatVnd(order.getTotalAmount()) + " cho khách");
        notificationService.createNotification(order.getUser().getId(),
                "Shop đã hoàn lại " + DtoMapper.formatVnd(order.getTotalAmount())
                        + " cho đơn " + order.getCode() + ".",
                "/orders/" + order.getId());
        return toDto(order, Viewer.STAFF);
    }

    @Override
    @Transactional
    public int expireUnpaidOrders() {
        LocalDateTime now = LocalDateTime.now();
        List<Long> candidates = orderRepository.findExpiredUnpaidOrderIds(
                List.of(Order.Status.PENDING, Order.Status.CONFIRMED),
                List.of(Order.PaymentMethod.BANK, Order.PaymentMethod.MOMO),
                now);
        int expired = 0;
        for (Long orderId : candidates) {
            Order order = orderRepository.findWithDetailsById(orderId).orElse(null);
            // Kiểm tra lại trong transaction: shop có thể vừa xác nhận thanh toán.
            if (order == null || order.getPaidAt() != null
                    || (order.getStatus() != Order.Status.PENDING && order.getStatus() != Order.Status.CONFIRMED)
                    || !order.getPaymentMethod().isPrepaid()
                    || order.getPaymentExpiresAt() == null
                    || !order.getPaymentExpiresAt().isBefore(now)) {
                continue;
            }

            changeStatus(order, Order.Status.CANCELLED, "Hết hạn thanh toán");
            notificationService.createNotification(order.getUser().getId(),
                    "Đơn hàng " + order.getCode()
                            + " đã tự hủy vì chưa được thanh toán trước hạn.",
                    "/orders/" + order.getId());
            notifyShop(order, "Đơn " + order.getCode() + " đã tự hủy vì khách chưa thanh toán.");
            expired++;
        }
        return expired;
    }

    // ---------- Quản trị ----------

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDto> getAllOrders(Long adminId) {
        accessGuard.requireAdmin(adminId);
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(order -> toDto(order, Viewer.STAFF))
                .toList();
    }

    // ---------- Thanh toán ----------

    /** Một kiện hàng = một đơn: các dòng sách cùng shop gộp chung, mỗi hộp Blind Book đi riêng. */
    private static final class Parcel {
        private final Shop shop;
        private final List<CartItem> lines = new ArrayList<>();

        private Parcel(Shop shop) {
            this.shop = shop;
        }

        private BigDecimal subtotal() {
            return lines.stream()
                    .map(line -> line.isBlindBox()
                            ? line.getBlindBox().getPrice()
                            : line.getBook().getSalePrice().multiply(BigDecimal.valueOf(line.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    private List<Parcel> splitIntoParcels(List<CartItem> cart) {
        List<Parcel> parcels = new ArrayList<>();
        Map<Long, Parcel> byShop = new LinkedHashMap<>();

        for (CartItem line : cart) {
            if (line.isBlindBox()) {
                BlindBox box = line.getBlindBox();
                Book hidden = box.getBook();
                if (box.getStatus() != BlindBox.Status.DRAFT || !hidden.isPurchasable() || hidden.getStockQuantity() < 1) {
                    throw ApiException.conflict("Cuốn sách trong một hộp Blind Book vừa hết hàng. "
                            + "Hãy xoá hộp đó khỏi giỏ và ghép hộp mới.");
                }
                Parcel parcel = new Parcel(hidden.getShop());
                parcel.lines.add(line);
                parcels.add(parcel);
                continue;
            }

            Book book = line.getBook();
            if (!book.isPurchasable()) {
                throw ApiException.conflict("\"" + book.getTitle() + "\" đã ngừng bán, hãy xoá khỏi giỏ hàng.");
            }
            if (line.getQuantity() > book.getStockQuantity()) {
                throw ApiException.conflict("\"" + book.getTitle() + "\" chỉ còn " + book.getStockQuantity()
                        + " cuốn trong kho.");
            }
            Long shopKey = book.getShop() == null ? 0L : book.getShop().getId();
            Parcel parcel = byShop.get(shopKey);
            if (parcel == null) {
                parcel = new Parcel(book.getShop());
                byShop.put(shopKey, parcel);
                parcels.add(parcel);
            }
            parcel.lines.add(line);
        }
        return parcels;
    }

    private OrderItem takeBook(CartItem line) {
        Book book = line.getBook();
        decreaseStock(book, line.getQuantity());
        return OrderItem.builder()
                .book(book)
                .bookTitle(book.getTitle())
                .coverImageUrl(book.getCoverImageUrl())
                .quantity(line.getQuantity())
                .unitPrice(book.getSalePrice())
                .build();
    }

    private OrderItem takeBlindBox(BlindBox box) {
        Book book = box.getBook();
        decreaseStock(book, 1);
        box.setStatus(BlindBox.Status.ORDERED);
        return OrderItem.builder()
                .book(book)
                .blindBox(box)
                .bookTitle(book.getTitle())
                .coverImageUrl(book.getCoverImageUrl())
                .quantity(1)
                .unitPrice(box.getPrice())
                .build();
    }

    private void decreaseStock(Book book, int quantity) {
        // UPDATE có điều kiện: nếu người khác vừa mua hết thì 0 dòng được cập nhật và cả lần thanh toán bị huỷ
        if (bookRepository.decreaseStock(book.getId(), quantity) == 0) {
            throw ApiException.conflict("\"" + book.getTitle() + "\" vừa hết hàng, vui lòng kiểm tra lại giỏ hàng.");
        }
    }

    private record AppliedVoucher(String code,
                                  Voucher.DiscountType discountType,
                                  BigDecimal discountValue,
                                  BigDecimal maxDiscount,
                                  UserVoucher personal) {
        static AppliedVoucher none() {
            return new AppliedVoucher(null, null, null, null, null);
        }
    }

    /** Voucher cá nhân (đổi bằng điểm) được ưu tiên trước mã công khai cùng tên. */
    private AppliedVoucher resolveVoucher(Long userId, String code, BigDecimal subtotal) {
        String normalized = InputUtils.blankToNull(code);
        if (normalized == null) {
            return AppliedVoucher.none();
        }

        UserVoucher personal = userVoucherRepository.findByUser_IdAndCodeIgnoreCase(userId, normalized).orElse(null);
        if (personal != null) {
            if (Boolean.TRUE.equals(personal.getUsed())) {
                throw ApiException.badRequest("Mã " + personal.getCode() + " đã được sử dụng.");
            }
            if (personal.getExpiresAt() != null && personal.getExpiresAt().isBefore(LocalDateTime.now())) {
                throw ApiException.badRequest("Mã " + personal.getCode() + " đã hết hạn.");
            }
            if (subtotal.compareTo(personal.getMinOrderAmount()) < 0) {
                throw ApiException.badRequest("Đơn tối thiểu " + DtoMapper.formatVnd(personal.getMinOrderAmount())
                        + " mới dùng được mã " + personal.getCode() + ".");
            }
            return new AppliedVoucher(personal.getCode(), personal.getDiscountType(),
                    personal.getDiscountValue(), personal.getMaxDiscount(), personal);
        }

        Voucher voucher = voucherRepository.findByCodeIgnoreCaseAndActiveTrue(normalized)
                .orElseThrow(() -> ApiException.badRequest("Mã giảm giá không tồn tại hoặc đã hết hạn."));
        if (subtotal.compareTo(voucher.getMinOrderAmount()) < 0) {
            throw ApiException.badRequest("Đơn tối thiểu " + DtoMapper.formatVnd(voucher.getMinOrderAmount())
                    + " mới dùng được mã " + voucher.getCode() + ".");
        }
        return new AppliedVoucher(voucher.getCode(), voucher.getDiscountType(),
                voucher.getDiscountValue(), voucher.getMaxDiscount(), null);
    }

    private String generateOrderCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = "BKG" + ThreadLocalRandom.current().nextInt(100_000, 1_000_000);
            if (!orderRepository.existsByCode(code)) {
                return code;
            }
        }
        throw ApiException.conflict("Hệ thống đang bận, vui lòng đặt hàng lại.");
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    // ---------- Trạng thái đơn ----------

    private Order findShopOrder(Long userId, Long orderId) {
        Shop shop = accessGuard.requireOwnShop(userId);
        Order order = orderRepository.findWithDetailsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng."));
        if (order.getShop() == null || !order.getShop().getId().equals(shop.getId())) {
            throw ApiException.notFound("Không tìm thấy đơn hàng.");
        }
        return order;
    }

    private Order findBuyerOrder(Long userId, Long orderId) {
        accessGuard.requireUser(userId);
        Order order = orderRepository.findWithDetailsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng."));
        if (!order.getUser().getId().equals(userId)) {
            // Trả 404 thay vì 403 để không lộ việc đơn của người khác có tồn tại
            throw ApiException.notFound("Không tìm thấy đơn hàng.");
        }
        return order;
    }

    private void changeStatus(Order order, Order.Status next, String note) {
        if (!order.getStatus().canMoveTo(next)) {
            throw ApiException.conflict("Không thể chuyển đơn từ \"" + order.getStatus().getLabel()
                    + "\" sang \"" + next.getLabel() + "\".");
        }
        if (next == Order.Status.CANCELLED) {
            for (OrderItem item : order.getItems()) {
                bookRepository.restoreStock(item.getBook().getId(), item.getQuantity());
                if (item.getBlindBox() != null) {
                    item.getBlindBox().setStatus(BlindBox.Status.CANCELLED);
                }
            }
            // Đơn cũ từng được cộng điểm lúc đặt hàng; đơn mới chỉ nhận điểm khi hoàn tất nên không cần trừ.
            if (hasOrderReward(order)) {
                pointService.deductPointsUpTo(order.getUser().getId(), ORDER_REWARD_POINTS, "ORDER_CANCELLED",
                        order.getCode(), "Trừ " + ORDER_REWARD_POINTS + " Điểm Bookigma do hủy đơn hàng #" + order.getCode());
            }
            int points = order.getPointsUsed() == null ? 0 : order.getPointsUsed();
            if (points > 0) {
                pointService.refundPoints(order.getUser().getId(), points, "ORDER_REFUND", order.getCode(),
                        "Hoàn Điểm Bookigma do đơn hàng #" + order.getCode() + " bị hủy");
            }
        }
        order.setStatus(next);
        order.addHistory(next, InputUtils.truncate(note, 255));

        // Trả voucher cá nhân về ví nếu không còn đơn nào khác trong lần thanh toán đó đang dùng mã này.
        if (next == Order.Status.CANCELLED && order.getVoucherCode() != null) {
            restorePersonalVoucher(order);
        }
        if (next == Order.Status.COMPLETED) {
            awardOrderPoints(order);
        }
    }

    private boolean hasOrderReward(Order order) {
        Long userId = order.getUser().getId();
        return pointService.hasTransaction(userId, ORDER_REWARD_TYPE, order.getCode())
                || pointService.hasTransaction(userId, LEGACY_ORDER_REWARD_TYPE, order.getCode());
    }

    private void awardOrderPoints(Order order) {
        if (hasOrderReward(order)) {
            return;
        }
        PointTransactionDto reward = pointService.addRewardPoints(order.getUser().getId(), ORDER_REWARD_POINTS,
                ORDER_REWARD_TYPE, order.getCode(), "Hoàn tất đơn hàng #" + order.getCode());
        notificationService.createNotification(order.getUser().getId(),
                "Đơn hàng " + order.getCode() + " đã hoàn tất. Bạn được cộng " + reward.getAmount()
                        + " Điểm Bookigma.",
                "/rewards");
    }

    private void restorePersonalVoucher(Order order) {
        userVoucherRepository.findByUser_IdAndCodeIgnoreCase(order.getUser().getId(), order.getVoucherCode())
                .filter(voucher -> Boolean.TRUE.equals(voucher.getUsed()))
                .ifPresent(voucher -> {
                    boolean stillInUse = orderRepository.existsByVoucherCodeAndStatusNotAndIdNot(
                            order.getVoucherCode(), Order.Status.CANCELLED, order.getId());
                    if (!stillInUse) {
                        voucher.setUsed(false);
                        voucher.setUsedAt(null);
                        voucher.setOrderId(null);
                        userVoucherRepository.save(voucher);
                    }
                });
    }

    private boolean hasBlindBox(Order order) {
        return order.getItems().stream().anyMatch(item -> item.getBlindBox() != null);
    }

    private String defaultShopNote(Order order, Order.Status next) {
        return switch (next) {
            case CONFIRMED -> "Shop xác nhận đơn hàng";
            case SHIPPING -> "Shop đã bàn giao cho đơn vị vận chuyển";
            case DELIVERED -> hasBlindBox(order)
                    ? "Giao hàng thành công — bấm \"Mở hộp\" để xem sách bên trong"
                    : "Giao hàng thành công";
            case CANCELLED -> order.getStatus() == Order.Status.PENDING ? "Shop từ chối đơn hàng" : "Shop hủy đơn hàng";
            default -> next.getLabel();
        };
    }

    private String buyerMessage(Order order, Order.Status next, String note) {
        String code = order.getCode();
        return switch (next) {
            case CONFIRMED -> "Đơn hàng " + code + " đã được shop xác nhận.";
            case SHIPPING -> "Đơn hàng " + code + " đang được giao tới bạn.";
            case DELIVERED -> hasBlindBox(order)
                    ? "Đơn hàng " + code + " đã giao thành công. Mở hộp Blind Book xem bên trong có gì nhé!"
                    : "Đơn hàng " + code + " đã giao thành công. Hãy xác nhận khi bạn nhận được hàng.";
            case CANCELLED -> "Đơn hàng " + code
                    + (order.getStatus() == Order.Status.PENDING ? " đã bị shop từ chối" : " đã bị shop hủy")
                    + (note == null ? "." : ": " + note)
                    + (order.getPaidAt() != null ? " Shop sẽ hoàn lại tiền bạn đã thanh toán." : "");
            default -> "Đơn hàng " + code + ": " + next.getLabel().toLowerCase() + ".";
        };
    }

    private void notifyShop(Order order, String message) {
        if (order.getShop() != null) {
            notificationService.createNotification(order.getShop().getOwner().getId(), message, "/shop-admin");
        }
    }

    // ---------- Chuyển sang DTO ----------

    private OrderResponseDto toDto(Order order, Viewer viewer) {
        Shop shop = order.getShop();
        return OrderResponseDto.builder()
                .id(order.getId())
                .code(order.getCode())
                .userId(order.getUser().getId())
                .buyerName(DtoMapper.displayName(order.getUser()))
                .shopId(shop == null ? null : shop.getId())
                .shopName(shop == null ? null : shop.getName())
                .status(DtoMapper.lower(order.getStatus()))
                .paymentMethod(DtoMapper.lower(order.getPaymentMethod()))
                .voucherCode(order.getVoucherCode())
                .note(order.getNote())
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .shippingAddress(order.getShippingAddress())
                .subtotal(order.getSubtotal())
                .shippingFee(order.getShippingFee())
                .discount(order.getDiscountAmount())
                .total(order.getTotalAmount())
                .paidAt(order.getPaidAt())
                .paymentExpiresAt(order.getPaymentExpiresAt())
                .refundedAt(order.getRefundedAt())
                .createdAt(order.getCreatedAt())
                .items(order.getItems().stream().map(item -> toItemDto(item, viewer)).toList())
                .timeline(order.getHistory().stream()
                        .map(entry -> OrderTimelineDto.builder()
                                .status(DtoMapper.lower(entry.getStatus()))
                                .note(entry.getNote())
                                .at(entry.getCreatedAt())
                                .build())
                        .toList())
                .build();
    }

    private OrderItemResponseDto toItemDto(OrderItem item, Viewer viewer) {
        BlindBox box = item.getBlindBox();
        boolean revealed = box != null && box.isRevealed();
        OrderItemResponseDto.OrderItemResponseDtoBuilder builder = OrderItemResponseDto.builder()
                .id(item.getId())
                .price(item.getUnitPrice())
                .quantity(item.getQuantity())
                .blindBox(box == null ? null : DtoMapper.toBlindBoxDto(box, null))
                .revealed(revealed);

        if (box != null && !revealed && viewer == Viewer.BUYER) {
            return builder
                    .title("Hộp Blind Book — " + box.getMood().getLabel())
                    .build();
        }
        Book book = item.getBook();
        return builder
                .bookId(book.getId())
                .title(item.getBookTitle())
                .author(book.getAuthor() == null ? null : book.getAuthor().getName())
                .coverUrl(item.getCoverImageUrl())
                .build();
    }
}
