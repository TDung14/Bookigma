package com.bookigma.bookigma.config;

import com.bookigma.bookigma.entity.Author;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.Category;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.Voucher;
import com.bookigma.bookigma.repository.AuthorRepository;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.CategoryRepository;
import com.bookigma.bookigma.repository.ShopRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.repository.VoucherRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Configuration
public class DataInitializer {

    private static final String DEFAULT_PASSWORD = "123456";

    @Bean
    CommandLineRunner initDemoData(
            UserRepository userRepository,
            ShopRepository shopRepository,
            CategoryRepository categoryRepository,
            AuthorRepository authorRepository,
            BookRepository bookRepository,
            VoucherRepository voucherRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            ensureDefaultUser(userRepository, passwordEncoder, "admin", "admin@bookigma.vn", "Administrator", User.Role.ADMIN);
            ensureDefaultUser(userRepository, passwordEncoder, "shop", "shop@bookigma.vn", "Bookigma Shop", User.Role.SHOP);
            ensureDefaultUser(userRepository, passwordEncoder, "user", "user@bookigma.vn", "User", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user1", "user1@bookigma.vn", "User1", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user2", "user2@bookigma.vn", "User2", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user3", "user3@bookigma.vn", "User3", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user4", "user4@bookigma.vn", "User4", User.Role.USER);

            ensureDemoCategories(categoryRepository);
            ensureDemoShop(shopRepository, userRepository);
            ensureDemoBooks(categoryRepository, authorRepository, shopRepository, bookRepository);
            ensureDemoVouchers(voucherRepository);
        };
    }

    private void ensureDemoCategories(CategoryRepository categoryRepository) {
        createCategoryIfMissing(categoryRepository, "Văn học", "van-hoc");
        createCategoryIfMissing(categoryRepository, "Kinh doanh", "kinh-doanh");
        createCategoryIfMissing(categoryRepository, "Kỹ năng sống", "ky-nang-song");
        createCategoryIfMissing(categoryRepository, "Thiếu nhi", "thieu-nhi");
        createCategoryIfMissing(categoryRepository, "Sách bán chạy", "sach-ban-chay");
    }

    private void ensureDemoShop(ShopRepository shopRepository, UserRepository userRepository) {
        User shopOwner = userRepository.findByUsernameIgnoreCase("shop").orElse(null);
        if (shopOwner == null) {
            return;
        }
        if (shopRepository.findByOwner_Id(shopOwner.getId()).isEmpty()) {
            Shop shop = Shop.builder()
                    .owner(shopOwner)
                    .name("Bookigma Store")
                    .description("Cửa hàng demo dành cho trải nghiệm mua sắm, đọc sách và blind box.")
                    .avatarUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80")
                    .followerCount(1285)
                    .verified(true)
                    .build();
            shopRepository.save(shop);
        }
    }

    private void ensureDemoBooks(CategoryRepository categoryRepository,
                                AuthorRepository authorRepository,
                                ShopRepository shopRepository,
                                BookRepository bookRepository) {
        Shop shop = shopRepository.findAll().stream().findFirst().orElse(null);
        if (shop == null) {
            return;
        }

        Category vanHoc = categoryRepository.findBySlug("van-hoc").orElse(null);
        Category kinhDoanh = categoryRepository.findBySlug("kinh-doanh").orElse(null);
        Category kyNang = categoryRepository.findBySlug("ky-nang-song").orElse(null);
        Category thieuNhi = categoryRepository.findBySlug("thieu-nhi").orElse(null);

        createBookIfMissing(bookRepository, authorRepository, "Minh Anh", vanHoc, shop, "Đừng Ngại Tự Tin",
                "Cuốn sách giúp bạn tìm lại sự tự tin trong cuộc sống và công việc.",
                "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80",
                260, List.of("tự tin", "phát triển", "cuộc sống"), new BigDecimal("249000"), new BigDecimal("179000"), 24);

        createBookIfMissing(bookRepository, authorRepository, "Quốc Khánh", kinhDoanh, shop, "Làm Giàu Từ Những Tấm Lòng",
                "Sách kinh doanh sáng tạo và cách xây dựng thói quen thành công nhờ sự kiên trì.",
                "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
                310, List.of("kinh doanh", "thành công", "tư duy"), new BigDecimal("280000"), new BigDecimal("199000"), 18);

        createBookIfMissing(bookRepository, authorRepository, "Lan Hương", kyNang, shop, "Đời Sống Có Ý Nghĩa",
                "Một hành trình khám phá mục tiêu sống, cảm xúc và sự cân bằng giữa công việc và gia đình.",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
                220, List.of("ý nghĩa", "sống khỏe", "tâm lý"), new BigDecimal("230000"), new BigDecimal("169000"), 30);

        createBookIfMissing(bookRepository, authorRepository, "Huyền Trang", thieuNhi, shop, "Bí Mật Của Những Trăng Tràn",
                "Truyện thiếu nhi nhẹ nhàng, đầy màu sắc và ý nghĩa giáo dục cho trẻ.",
                "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80",
                180, List.of("thiếu nhi", "truyện ngắn", "giáo dục"), new BigDecimal("145000"), new BigDecimal("99000"), 41);
    }

    private void ensureDemoVouchers(VoucherRepository voucherRepository) {
        ensureVoucher(voucherRepository, "BOOK10", "Giảm 10k cho mọi đơn", Voucher.DiscountType.AMOUNT, new BigDecimal("10000"), null, new BigDecimal("150000"));
        ensureVoucher(voucherRepository, "SAVE20", "Giảm 20% tối đa 50k", Voucher.DiscountType.PERCENT, new BigDecimal("20"), new BigDecimal("50000"), new BigDecimal("200000"));
        ensureVoucher(voucherRepository, "FREESHIP", "Miễn phí ship", Voucher.DiscountType.SHIPPING, new BigDecimal("0"), null, new BigDecimal("300000"));
    }

    private void ensureVoucher(VoucherRepository voucherRepository, String code, String label, Voucher.DiscountType type,
                              BigDecimal value, BigDecimal maxDiscount, BigDecimal minOrderAmount) {
        if (voucherRepository.findByCodeIgnoreCaseAndActiveTrue(code).isEmpty()) {
            voucherRepository.save(Voucher.builder()
                    .code(code)
                    .label(label)
                    .discountType(type)
                    .discountValue(value)
                    .maxDiscount(maxDiscount)
                    .minOrderAmount(minOrderAmount)
                    .active(true)
                    .build());
        }
    }

    private void createCategoryIfMissing(CategoryRepository categoryRepository, String name, String slug) {
        if (categoryRepository.findBySlug(slug).isEmpty() && categoryRepository.findByNameIgnoreCase(name).isEmpty()) {
            categoryRepository.save(Category.builder().name(name).slug(slug).build());
        }
    }

    private void createBookIfMissing(BookRepository bookRepository,
                                    AuthorRepository authorRepository,
                                    String authorName,
                                    Category category,
                                    Shop shop,
                                    String title,
                                    String description,
                                    String coverUrl,
                                    Integer pageCount,
                                    List<String> tags,
                                    BigDecimal salePrice,
                                    BigDecimal originalPrice,
                                    Integer stockQuantity) {
        boolean exists = bookRepository.findAll().stream().anyMatch(book -> book.getTitle().equalsIgnoreCase(title));
        if (exists || category == null || shop == null) {
            return;
        }

        Author author = authorRepository.findFirstByNameIgnoreCase(authorName)
                .orElseGet(() -> authorRepository.save(Author.builder().name(authorName).bio("Demo author").build()));

        Book book = Book.builder()
                .shop(shop)
                .title(title)
                .author(author)
                .category(category)
                .description(description)
                .coverImageUrl(coverUrl)
                .pageCount(pageCount)
                .tags(tags)
                .forSale(true)
                .blindBook(false)
                .salePrice(salePrice)
                .originalPrice(originalPrice)
                .stockQuantity(stockQuantity)
                .soldCount(0)
                .ratingAvg(new BigDecimal("4.8"))
                .ratingCount(42)
                .status(Book.Status.ACTIVE)
                .build();

        bookRepository.save(book);
    }

    /**
     * Chỉ tạo tài khoản demo khi chưa có. Không đổi username/mật khẩu tài khoản
     * đã tồn tại — nếu làm vậy, mỗi lần khởi động backend sẽ ghi đè mật khẩu
     * người dùng vừa đăng ký (nếu trùng email/username demo).
     */
    private void ensureDefaultUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String username,
            String email,
            String fullName,
            User.Role role
    ) {
        String normalizedUsername = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);

        if (normalizedUsername.isBlank() || normalizedEmail.isBlank()) {
            return;
        }

        if (userRepository.findByUsernameIgnoreCase(normalizedUsername).isPresent()
                || userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            return;
        }

        User user = User.builder()
                .username(normalizedUsername)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName(fullName)
                .role(role)
                .active(true)
                .build();

        userRepository.save(user);
        System.out.println("Created account: " + normalizedUsername + " | role: " + role);
    }
}
