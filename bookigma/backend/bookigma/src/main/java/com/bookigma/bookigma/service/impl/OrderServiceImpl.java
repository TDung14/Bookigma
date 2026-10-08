package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.CheckoutRequestDto;
import com.bookigma.bookigma.dto.OrderItemResponseDto;
import com.bookigma.bookigma.dto.OrderResponseDto;
import com.bookigma.bookigma.dto.OrderTimelineDto;
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
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.DtoMapper;
import com.bookigma.bookigma.service.InputUtils;
import com.bookigma.bookigma.service.NotificationService;
import com.bookigma.bookigma.service.OrderPricing;
import com.bookigma.bookigma.service.OrderService;
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

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final BookRepository bookRepository;
    private final VoucherRepository voucherRepository;
    private final AccessGuard accessGuard;
    private final NotificationService notificationService;
    private final com.bookigma.bookigma.service.PointService pointService;

    public OrderServiceImpl(OrderRepository orderRepository,
                            CartItemRepository cartItemRepository,
                            BookRepository bookRepository,
                            VoucherRepository voucherRepository,
                            AccessGuard accessGuard,
                            NotificationService notificationService,
                            com.bookigma.bookigma.service.PointService pointService) {
        this.orderRepository = orderRepository;
        this.cartItemRepository = cartItemRepository;
        this.bookRepository = bookRepository;
        this.voucherRepository = voucherRepository;
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

        Voucher voucher = resolveVoucher(request.getVoucherCode(), subtotal);
        List<BigDecimal> discounts = new ArrayList<>(OrderPricing.allocate(OrderPricing.discountFor(voucher, subtotal), subtotals));
        boolean freeShipping = voucher != null && voucher.getDiscountType() == Voucher.DiscountType.SHIPPING;

        Integer pointsToUse = request.getPointsToUse();
        if (pointsToUse != null && pointsToUse > 0) {
            pointService.deductPoints(buyer.getId(), pointsToUse, "ORDER_DISCOUNT", "CHECKOUT", "Dùng Điểm Bookigma giảm giá đơn hàng");
            BigDecimal pointsDiscount = BigDecimal.valueOf(pointsToUse);
            List<BigDecimal> extraDiscounts = OrderPricing.allocate(pointsDiscount, subtotals);
            for (int i = 0; i < discounts.size(); i++) {
                discounts.set(i, discounts.get(i).add(extraDiscounts.get(i)));
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
                    .voucherCode(voucher == null ? null : voucher.getCode())
                    .subtotal(money(subtotals.get(i)))
                    .shippingFee(money(shippingFee))
                    .discountAmount(money(discount))
                    .totalAmount(money(subtotals.get(i).subtract(discount).add(shippingFee).max(BigDecimal.ZERO)))
                    .status(Order.Status.PENDING)
                    .build();

            for (CartItem line : parcel.lines) {
                order.addItem(line.isBlindBox() ? takeBlindBox(line.getBlindBox()) : takeBook(line));
            }
            order.addHistory(Order.Status.PENDING, "Đơn hàng được tạo");
            orders.add(orderRepository.save(order));
        }

        cartItemRepository.deleteAll(cart);

        for (Order order : orders) {
            notificationService.createNotification(buyer.getId(),
                    "Đơn hàng " + order.getCode() + " đã được tạo và đang chờ shop xác nhận.",
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
        notifyShop(order, "Khách hàng đã hủy đơn " + order.getCode() + ".");
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
        awardPointsForCompletedOrder(order);
        return toDto(order, Viewer.BUYER);
    }

    private void awardPointsForCompletedOrder(Order order) {
        if (order.getTotalAmount() != null && order.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            int rewardPoints = order.getTotalAmount().multiply(new BigDecimal("0.01")).intValue();
            if (rewardPoints > 0) {
                try {
                    pointService.addPoints(
                            order.getUser().getId(),
                            rewardPoints,
                            "ORDER_REWARD",
                            order.getCode(),
                            "Thưởng Điểm từ đơn hàng #" + order.getCode()
                    );
                } catch (Exception ignored) {}
            }
        }
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
        Shop shop = accessGuard.requireOwnShop(userId);
        Order order = orderRepository.findWithDetailsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng."));
        if (order.getShop() == null || !order.getShop().getId().equals(shop.getId())) {
            throw ApiException.notFound("Không tìm thấy đơn hàng.");
        }

        Order.Status next = InputUtils.parseEnum(Order.Status.class, request.getStatus(),
                "Trạng thái đơn hàng không hợp lệ.");
        // Shop chỉ đẩy đơn đi tiếp, hoặc từ chối đơn chưa xác nhận. Hoàn thành là việc của người mua.
        boolean allowedForShop = switch (next) {
            case CONFIRMED, SHIPPING, DELIVERED -> true;
            case CANCELLED -> order.getStatus() == Order.Status.PENDING;
            case PENDING, COMPLETED -> false;
        };
        if (!allowedForShop || !order.getStatus().canMoveTo(next)) {
            throw ApiException.conflict("Không thể chuyển đơn từ \"" + order.getStatus().getLabel()
                    + "\" sang \"" + next.getLabel() + "\".");
        }

        String note = InputUtils.blankToNull(request.getNote());
        changeStatus(order, next, note == null ? defaultShopNote(order, next) : note);
        notificationService.createNotification(order.getUser().getId(),
                buyerMessage(order, next, note), "/orders/" + order.getId());
        return toDto(order, Viewer.STAFF);
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

    private Voucher resolveVoucher(String code, BigDecimal subtotal) {
        String normalized = InputUtils.blankToNull(code);
        if (normalized == null) {
            return null;
        }
        Voucher voucher = voucherRepository.findByCodeIgnoreCaseAndActiveTrue(normalized)
                .orElseThrow(() -> ApiException.badRequest("Mã giảm giá không tồn tại hoặc đã hết hạn."));
        if (subtotal.compareTo(voucher.getMinOrderAmount()) < 0) {
            throw ApiException.badRequest("Đơn tối thiểu " + DtoMapper.formatVnd(voucher.getMinOrderAmount())
                    + " mới dùng được mã " + voucher.getCode() + ".");
        }
        return voucher;
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
        }
        order.setStatus(next);
        order.addHistory(next, InputUtils.truncate(note, 255));
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
            case CANCELLED -> "Shop từ chối đơn hàng";
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
            case CANCELLED -> "Đơn hàng " + code + " đã bị shop từ chối" + (note == null ? "." : ": " + note);
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
