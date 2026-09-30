package com.bookigma.bookigma.service.impl;

import com.bookigma.bookigma.dto.BookRequestDto;
import com.bookigma.bookigma.dto.BookResponseDto;
import com.bookigma.bookigma.entity.Author;
import com.bookigma.bookigma.entity.BlindBox;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.Category;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.exception.ApiException;
import com.bookigma.bookigma.repository.AuthorRepository;
import com.bookigma.bookigma.repository.BlindBoxRepository;
import com.bookigma.bookigma.repository.BookChapterRepository;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.CartItemRepository;
import com.bookigma.bookigma.repository.CategoryRepository;
import com.bookigma.bookigma.repository.OrderItemRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.service.AccessGuard;
import com.bookigma.bookigma.service.BookService;
import com.bookigma.bookigma.service.DtoMapper;
import com.bookigma.bookigma.service.InputUtils;
import com.bookigma.bookigma.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class BookServiceImpl implements BookService {
    private static final int MAX_TAGS = 10;
    private static final int MAX_TAG_LENGTH = 40;

    private final BookRepository bookRepository;
    private final BookChapterRepository chapterRepository;
    private final AuthorRepository authorRepository;
    private final CategoryRepository categoryRepository;
    private final CartItemRepository cartItemRepository;
    private final BlindBoxRepository blindBoxRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final AccessGuard accessGuard;
    private final NotificationService notificationService;

    public BookServiceImpl(BookRepository bookRepository,
                           BookChapterRepository chapterRepository,
                           AuthorRepository authorRepository,
                           CategoryRepository categoryRepository,
                           CartItemRepository cartItemRepository,
                           BlindBoxRepository blindBoxRepository,
                           OrderItemRepository orderItemRepository,
                           UserRepository userRepository,
                           AccessGuard accessGuard,
                           NotificationService notificationService) {
        this.bookRepository = bookRepository;
        this.chapterRepository = chapterRepository;
        this.authorRepository = authorRepository;
        this.categoryRepository = categoryRepository;
        this.cartItemRepository = cartItemRepository;
        this.blindBoxRepository = blindBoxRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.accessGuard = accessGuard;
        this.notificationService = notificationService;
    }

    // ---------- Cửa hàng ----------

    @Override
    @Transactional(readOnly = true)
    public List<BookResponseDto> getActiveBooks() {
        return bookRepository.findByStatusAndForSaleTrueOrderByCreatedAtDesc(Book.Status.ACTIVE).stream()
                .map(DtoMapper::toBookDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BookResponseDto getBook(Long bookId, Long viewerId) {
        Book book = bookRepository.findWithDetailsById(bookId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sách."));
        // Sách chờ duyệt / đã ẩn chỉ chủ shop và admin xem được
        if (book.getStatus() != Book.Status.ACTIVE && !canManage(book, viewerId)) {
            throw ApiException.notFound("Không tìm thấy sách.");
        }
        return DtoMapper.toBookDto(book, chapterRepository.findByBookIdOrderByChapterIndexAsc(bookId));
    }

    // ---------- Kênh người bán ----------

    @Override
    @Transactional(readOnly = true)
    public List<BookResponseDto> getShopBooks(Long userId) {
        Shop shop = accessGuard.requireOwnShop(userId);
        return bookRepository.findByShop_IdOrderByCreatedAtDesc(shop.getId()).stream()
                .map(DtoMapper::toBookDto)
                .toList();
    }

    @Override
    @Transactional
    public BookResponseDto createShopBook(Long userId, BookRequestDto request) {
        Shop shop = accessGuard.requireOwnShop(userId);
        Book book = Book.builder()
                .shop(shop)
                .forSale(true)
                .status(Book.Status.PENDING)
                .build();
        applyRequest(book, request);
        Book saved = bookRepository.save(book);

        String message = "Sản phẩm mới \"" + saved.getTitle() + "\" của " + shop.getName() + " đang chờ duyệt.";
        userRepository.findByRole(User.Role.ADMIN)
                .forEach(admin -> notificationService.createNotification(admin.getId(), message, "/admin"));
        return DtoMapper.toBookDto(saved);
    }

    @Override
    @Transactional
    public BookResponseDto updateShopBook(Long userId, Long bookId, BookRequestDto request) {
        Shop shop = accessGuard.requireOwnShop(userId);
        Book book = findShopBook(shop, bookId);
        applyRequest(book, request);
        return DtoMapper.toBookDto(book);
    }

    @Override
    @Transactional
    public Map<String, Object> deleteShopBook(Long userId, Long bookId) {
        Shop shop = accessGuard.requireOwnShop(userId);
        return removeBook(findShopBook(shop, bookId));
    }

    // ---------- Quản trị ----------

    @Override
    @Transactional(readOnly = true)
    public List<BookResponseDto> getAllBooks(Long adminId) {
        accessGuard.requireAdmin(adminId);
        return bookRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(DtoMapper::toBookDto)
                .toList();
    }

    @Override
    @Transactional
    public BookResponseDto updateBookStatus(Long adminId, Long bookId, String status) {
        accessGuard.requireAdmin(adminId);
        Book book = findBook(bookId);
        Book.Status next = InputUtils.parseEnum(Book.Status.class, status, "Trạng thái sản phẩm không hợp lệ.");
        Book.Status previous = book.getStatus();
        book.setStatus(next);

        if (previous != next && book.getShop() != null) {
            String message = switch (next) {
                case ACTIVE -> previous == Book.Status.PENDING
                        ? "Sản phẩm \"" + book.getTitle() + "\" đã được duyệt và đang được bán."
                        : "Sản phẩm \"" + book.getTitle() + "\" đã được hiển thị lại trên cửa hàng.";
                case HIDDEN -> "Sản phẩm \"" + book.getTitle() + "\" đã bị quản trị viên gỡ khỏi cửa hàng.";
                case PENDING -> null;
            };
            if (message != null) {
                notificationService.createNotification(book.getShop().getOwner().getId(), message, "/shop-admin");
            }
        }
        return DtoMapper.toBookDto(book);
    }

    @Override
    @Transactional
    public Map<String, Object> deleteBook(Long adminId, Long bookId) {
        accessGuard.requireAdmin(adminId);
        return removeBook(findBook(bookId));
    }

    // ---------- Nội bộ ----------

    private Book findBook(Long bookId) {
        return bookRepository.findWithDetailsById(bookId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sách."));
    }

    private Book findShopBook(Shop shop, Long bookId) {
        Book book = findBook(bookId);
        if (book.getShop() == null || !book.getShop().getId().equals(shop.getId())) {
            throw ApiException.notFound("Không tìm thấy sản phẩm trong shop của bạn.");
        }
        return book;
    }

    private boolean canManage(Book book, Long userId) {
        if (userId == null) {
            return false;
        }
        User viewer = userRepository.findById(userId).orElse(null);
        if (viewer == null) {
            return false;
        }
        if (viewer.getRole() == User.Role.ADMIN) {
            return true;
        }
        return book.getShop() != null && book.getShop().getOwner().getId().equals(userId);
    }

    /**
     * Xoá sản phẩm. Sách đã từng nằm trong đơn hàng thì không xoá được (lịch sử đơn cần giữ),
     * nên chỉ ẩn khỏi cửa hàng.
     */
    private Map<String, Object> removeBook(Book book) {
        cartItemRepository.deleteByBook_Id(book.getId());
        blindBoxRepository.deleteAll(blindBoxRepository.findByBook_IdAndStatus(book.getId(), BlindBox.Status.DRAFT));

        if (orderItemRepository.existsByBook_Id(book.getId())) {
            book.setStatus(Book.Status.HIDDEN);
            return Map.of(
                    "deleted", false,
                    "message", "Sản phẩm đã có đơn hàng nên được ẩn khỏi cửa hàng thay vì xoá hẳn.");
        }
        bookRepository.delete(book);
        return Map.of("deleted", true, "message", "Đã xoá sản phẩm.");
    }

    private void applyRequest(Book book, BookRequestDto request) {
        BigDecimal price = request.getPrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal originalPrice = request.getOriginalPrice() == null
                ? price
                : request.getOriginalPrice().setScale(2, RoundingMode.HALF_UP);
        if (originalPrice.compareTo(price) < 0) {
            throw ApiException.badRequest("Giá gốc phải lớn hơn hoặc bằng giá bán.");
        }

        String categoryName = request.getCategory().trim();
        Category category = categoryRepository.findByNameIgnoreCase(categoryName)
                .orElseThrow(() -> ApiException.badRequest("Thể loại \"" + categoryName + "\" không tồn tại."));

        book.setTitle(request.getTitle().trim());
        book.setAuthor(resolveAuthor(request.getAuthor().trim()));
        book.setCategory(category);
        book.setSalePrice(price);
        book.setOriginalPrice(originalPrice);
        book.setStockQuantity(request.getStock());
        book.setPageCount(request.getPages());
        book.setCoverImageUrl(InputUtils.optionalHttpUrl(request.getCoverUrl()));
        book.setDescription(InputUtils.blankToNull(request.getDescription()));
        book.setTags(normalizeTags(request.getTags()));
    }

    private Author resolveAuthor(String name) {
        return authorRepository.findFirstByNameIgnoreCase(name)
                .orElseGet(() -> authorRepository.save(Author.builder().name(name).build()));
    }

    /** Từ khoá lưu thành chuỗi cách nhau bởi dấu phẩy, nên bỏ dấu phẩy bên trong từng từ khoá. */
    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return new ArrayList<>();
        }
        return tags.stream()
                .filter(Objects::nonNull)
                .map(tag -> tag.replace(",", " ").trim())
                .filter(tag -> !tag.isEmpty())
                .map(tag -> tag.length() > MAX_TAG_LENGTH ? tag.substring(0, MAX_TAG_LENGTH) : tag)
                .distinct()
                .limit(MAX_TAGS)
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
