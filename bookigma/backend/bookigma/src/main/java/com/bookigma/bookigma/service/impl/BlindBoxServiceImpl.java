package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.BlindBoxMatchRequestDto;
import com.bookigma.bookigma.dto.BlindBoxResponseDto;
import com.bookigma.bookigma.entity.BlindBox;
import com.bookigma.bookigma.entity.BlindBoxMood;
import com.bookigma.bookigma.entity.BlindBoxTier;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.CartItem;
import com.bookigma.bookigma.entity.Order;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.BlindBoxRepository;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.CartItemRepository;
import com.bookigma.bookigma.repository.OrderItemRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.BlindBoxMatcher;
import com.bookigma.bookigma.service.BlindBoxService;
import com.bookigma.bookigma.service.DtoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class BlindBoxServiceImpl implements BlindBoxService {
    /** Giới hạn danh sách sách đã đọc client gửi lên, tránh request quá lớn. */
    private static final int MAX_CLIENT_EXCLUDES = 500;

    private final BlindBoxRepository blindBoxRepository;
    private final BookRepository bookRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderItemRepository orderItemRepository;
    private final AccessGuard accessGuard;

    public BlindBoxServiceImpl(BlindBoxRepository blindBoxRepository,
                               BookRepository bookRepository,
                               CartItemRepository cartItemRepository,
                               OrderItemRepository orderItemRepository,
                               AccessGuard accessGuard) {
        this.blindBoxRepository = blindBoxRepository;
        this.bookRepository = bookRepository;
        this.cartItemRepository = cartItemRepository;
        this.orderItemRepository = orderItemRepository;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional
    public BlindBoxResponseDto match(Long userId, BlindBoxMatchRequestDto request) {
        accessGuard.requireUser(userId);
        BlindBoxTier tier = BlindBoxTier.fromId(request.getTierId());
        if (tier == null) {
            throw ApiException.badRequest("Mức hộp không hợp lệ.");
        }
        BlindBoxMood mood = BlindBoxMood.fromId(request.getMoodId());
        if (mood == null) {
            throw ApiException.badRequest("Tâm trạng không hợp lệ.");
        }

        BlindBox current = null;
        if (request.getBoxId() != null) {
            current = blindBoxRepository.findByIdAndUserId(request.getBoxId(), userId)
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy hộp Blind Book."));
            if (current.getStatus() != BlindBox.Status.DRAFT) {
                throw ApiException.conflict("Hộp này đã được đặt mua, không thể đổi sách.");
            }
            if (cartItemRepository.existsByBlindBox_Id(current.getId())) {
                throw ApiException.conflict("Hộp đã nằm trong giỏ hàng. Hãy xoá khỏi giỏ nếu muốn ghép lại.");
            }
        }
        // Cùng tâm trạng + mức hộp nghĩa là người dùng bấm "Đổi cuốn khác": phải ra cuốn khác cuốn hiện tại
        boolean reroll = current != null && current.getTier() == tier && current.getMood() == mood;

        Set<Long> excluded = excludedBookIds(userId, request.getExcludeBookIds());
        if (reroll) {
            excluded.add(current.getBook().getId());
        }

        List<Book> candidates = bookRepository
                .findByStatusAndForSaleTrueAndStockQuantityGreaterThan(Book.Status.ACTIVE, 0).stream()
                .filter(book -> Boolean.TRUE.equals(book.getBlindBook()))
                .filter(book -> !excluded.contains(book.getId()))
                .toList();
        Book picked = BlindBoxMatcher.pick(candidates, mood, tier, ThreadLocalRandom.current())
                .orElseThrow(() -> reroll
                        ? ApiException.conflict("Không còn cuốn nào khác phù hợp với tâm trạng và mức hộp này. "
                                + "Bạn có thể giữ cuốn hiện tại hoặc chọn tâm trạng khác.")
                        : ApiException.notFound("Kho hiện chưa có cuốn nào khớp tâm trạng này mà bạn chưa đọc. "
                                + "Thử tâm trạng khác nhé."));

        BlindBox box = current != null ? current : BlindBox.builder()
                .userId(userId)
                .status(BlindBox.Status.DRAFT)
                .build();
        box.setTier(tier);
        box.setMood(mood);
        box.setPrice(tier.getPrice());
        box.setBook(picked);
        BlindBox saved = blindBoxRepository.save(box);

        // Người dùng chỉ đang xem một hộp tại một thời điểm: dọn các hộp nháp bỏ dở trước đó
        blindBoxRepository.deleteDraftsNotInCart(userId, BlindBox.Status.DRAFT, saved.getId());
        return DtoMapper.toBlindBoxDto(saved, BlindBoxMatcher.hints(picked));
    }

    /** Không ghép những cuốn người dùng đã đọc, đã mua, đang có trong giỏ hoặc đang nằm trong hộp khác. */
    private Set<Long> excludedBookIds(Long userId, List<Long> clientExcluded) {
        Set<Long> ids = new HashSet<>();
        if (clientExcluded != null) {
            clientExcluded.stream()
                    .filter(Objects::nonNull)
                    .limit(MAX_CLIENT_EXCLUDES)
                    .forEach(ids::add);
        }
        ids.addAll(orderItemRepository.findPurchasedBookIds(userId, Order.Status.CANCELLED));
        for (CartItem line : cartItemRepository.findByUserIdOrderByCreatedAtAscIdAsc(userId)) {
            if (line.getBook() != null) {
                ids.add(line.getBook().getId());
            }
            if (line.getBlindBox() != null) {
                ids.add(line.getBlindBox().getBook().getId());
            }
        }
        return ids;
    }
}
