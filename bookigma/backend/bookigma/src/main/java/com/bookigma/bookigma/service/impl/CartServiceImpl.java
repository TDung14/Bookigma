package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.CartItemRequestDto;
import com.bookigma.bookigma.dto.CartItemResponseDto;
import com.bookigma.bookigma.entity.BlindBox;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.CartItem;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.BlindBoxRepository;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.CartItemRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.CartService;
import com.bookigma.bookigma.service.DtoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CartServiceImpl implements CartService {
    private static final int MAX_QUANTITY_PER_BOOK = 99;

    private final CartItemRepository cartItemRepository;
    private final BookRepository bookRepository;
    private final BlindBoxRepository blindBoxRepository;
    private final AccessGuard accessGuard;

    public CartServiceImpl(CartItemRepository cartItemRepository,
                           BookRepository bookRepository,
                           BlindBoxRepository blindBoxRepository,
                           AccessGuard accessGuard) {
        this.cartItemRepository = cartItemRepository;
        this.bookRepository = bookRepository;
        this.blindBoxRepository = blindBoxRepository;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CartItemResponseDto> getCart(Long userId) {
        accessGuard.requireUser(userId);
        return currentCart(userId);
    }

    @Override
    @Transactional
    public List<CartItemResponseDto> addItem(Long userId, CartItemRequestDto request) {
        accessGuard.requireUser(userId);
        if (request.getBlindBoxId() != null) {
            addBlindBox(userId, request.getBlindBoxId());
        } else if (request.getBookId() != null) {
            addBook(userId, request.getBookId(), request.getQuantity() == null ? 1 : request.getQuantity());
        } else {
            throw ApiException.badRequest("Hãy chọn sách hoặc hộp Blind Book để thêm vào giỏ.");
        }
        return currentCart(userId);
    }

    @Override
    @Transactional
    public List<CartItemResponseDto> updateQuantity(Long userId, Long itemId, int quantity) {
        accessGuard.requireUser(userId);
        CartItem item = findOwnItem(userId, itemId);
        if (item.isBlindBox()) {
            throw ApiException.badRequest("Mỗi hộp Blind Book chỉ có số lượng 1.");
        }
        Book book = item.getBook();
        if (quantity > book.getStockQuantity()) {
            throw ApiException.badRequest("Chỉ còn " + book.getStockQuantity() + " cuốn trong kho.");
        }
        item.setQuantity(quantity);
        return currentCart(userId);
    }

    @Override
    @Transactional
    public List<CartItemResponseDto> removeItem(Long userId, Long itemId) {
        accessGuard.requireUser(userId);
        CartItem item = findOwnItem(userId, itemId);
        BlindBox box = item.getBlindBox();
        cartItemRepository.delete(item);
        // Hộp Blind Book bỏ khỏi giỏ thì bỏ luôn, lần sau người dùng ghép hộp mới
        if (box != null && box.getStatus() == BlindBox.Status.DRAFT) {
            blindBoxRepository.delete(box);
        }
        return currentCart(userId);
    }

    private void addBook(Long userId, Long bookId, int quantity) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sách."));
        if (!book.isPurchasable()) {
            throw ApiException.badRequest("Sách này hiện không còn bán.");
        }

        CartItem item = cartItemRepository.findByUserIdAndBook_Id(userId, bookId).orElse(null);
        int inCart = item == null ? 0 : item.getQuantity();
        int newQuantity = inCart + quantity;
        if (book.getStockQuantity() <= 0) {
            throw ApiException.badRequest("Sản phẩm đã hết hàng.");
        }
        if (newQuantity > book.getStockQuantity()) {
            throw ApiException.badRequest("Chỉ còn " + book.getStockQuantity() + " cuốn trong kho"
                    + (inCart > 0 ? " (giỏ của bạn đã có " + inCart + " cuốn)." : "."));
        }
        if (newQuantity > MAX_QUANTITY_PER_BOOK) {
            throw ApiException.badRequest("Mỗi sản phẩm tối đa " + MAX_QUANTITY_PER_BOOK + " cuốn trong giỏ.");
        }

        if (item == null) {
            cartItemRepository.save(CartItem.builder()
                    .userId(userId)
                    .book(book)
                    .quantity(newQuantity)
                    .build());
        } else {
            item.setQuantity(newQuantity);
        }
    }

    private void addBlindBox(Long userId, Long blindBoxId) {
        BlindBox box = blindBoxRepository.findByIdAndUserId(blindBoxId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hộp Blind Book."));
        if (box.getStatus() != BlindBox.Status.DRAFT) {
            throw ApiException.badRequest("Hộp này đã được đặt mua.");
        }
        if (cartItemRepository.existsByBlindBox_Id(blindBoxId)) {
            return; // đã nằm trong giỏ
        }
        cartItemRepository.save(CartItem.builder()
                .userId(userId)
                .blindBox(box)
                .quantity(1)
                .build());
    }

    private CartItem findOwnItem(Long userId, Long itemId) {
        return cartItemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Sản phẩm không có trong giỏ hàng."));
    }

    private List<CartItemResponseDto> currentCart(Long userId) {
        return cartItemRepository.findByUserIdOrderByCreatedAtAscIdAsc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    private CartItemResponseDto toDto(CartItem item) {
        if (item.isBlindBox()) {
            BlindBox box = item.getBlindBox();
            Book hidden = box.getBook();
            boolean available = box.getStatus() == BlindBox.Status.DRAFT
                    && hidden.isPurchasable()
                    && hidden.getStockQuantity() >= 1;
            return CartItemResponseDto.builder()
                    .id(item.getId())
                    .type("BLIND_BOX")
                    .quantity(1)
                    .available(available)
                    .unavailableReason(available ? null
                            : "Cuốn sách trong hộp vừa hết hàng — hãy xoá hộp này và ghép hộp mới.")
                    .price(box.getPrice())
                    .blindBox(DtoMapper.toBlindBoxDto(box, null))
                    .build();
        }

        Book book = item.getBook();
        Shop shop = book.getShop();
        String reason = null;
        if (!book.isPurchasable()) {
            reason = "Sản phẩm đã ngừng bán.";
        } else if (book.getStockQuantity() <= 0) {
            reason = "Sản phẩm đã hết hàng.";
        } else if (item.getQuantity() > book.getStockQuantity()) {
            reason = "Chỉ còn " + book.getStockQuantity() + " cuốn trong kho.";
        }
        return CartItemResponseDto.builder()
                .id(item.getId())
                .type("BOOK")
                .quantity(item.getQuantity())
                .available(reason == null)
                .unavailableReason(reason)
                .bookId(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor() == null ? null : book.getAuthor().getName())
                .coverUrl(book.getCoverImageUrl())
                .price(book.getSalePrice())
                .stock(book.getStockQuantity())
                .shopId(shop == null ? null : shop.getId())
                .shopName(shop == null ? null : shop.getName())
                .build();
    }
}
