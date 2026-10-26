package com.bookigma.bookigma.config;

import com.bookigma.bookigma.club.entity.BookClub;
import com.bookigma.bookigma.club.entity.ClubJoinRequest;
import com.bookigma.bookigma.club.entity.ClubMember;
import com.bookigma.bookigma.club.entity.ClubMemberId;
import com.bookigma.bookigma.club.repository.BookClubRepository;
import com.bookigma.bookigma.club.repository.ClubJoinRequestRepository;
import com.bookigma.bookigma.club.repository.ClubMemberRepository;
import com.bookigma.bookigma.entity.Author;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.Category;
import com.bookigma.bookigma.entity.Post;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;
import com.bookigma.bookigma.entity.Voucher;
import com.bookigma.bookigma.repository.AuthorRepository;
import com.bookigma.bookigma.repository.BookRepository;
import com.bookigma.bookigma.repository.CategoryRepository;
import com.bookigma.bookigma.repository.PostRepository;
import com.bookigma.bookigma.repository.ShopRepository;
import com.bookigma.bookigma.repository.UserRepository;
import com.bookigma.bookigma.repository.VoucherRepository;
import com.bookigma.bookigma.repository.BookChapterRepository;
import com.bookigma.bookigma.entity.BookChapter;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

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
            BookChapterRepository bookChapterRepository,
            VoucherRepository voucherRepository,
            BookClubRepository bookClubRepository,
            ClubMemberRepository clubMemberRepository,
            ClubJoinRequestRepository clubJoinRequestRepository,
            PostRepository postRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            ensureDefaultUser(userRepository, passwordEncoder, "admin", "admin@bookigma.vn", "Administrator", User.Role.ADMIN);
            ensureDefaultUser(userRepository, passwordEncoder, "support", "support@bookigma.vn", "Hỗ trợ Bookigma", User.Role.SUPPORT);
            ensureDefaultUser(userRepository, passwordEncoder, "shop", "shop@bookigma.vn", "Bookigma Shop", User.Role.SHOP);
            ensureDefaultUser(userRepository, passwordEncoder, "user", "user@bookigma.vn", "User", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user1", "user1@bookigma.vn", "User1", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user2", "user2@bookigma.vn", "User2", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user3", "user3@bookigma.vn", "User3", User.Role.USER);
            ensureDefaultUser(userRepository, passwordEncoder, "user4", "user4@bookigma.vn", "User4", User.Role.USER);

            ensureDemoCategories(categoryRepository);
            ensureDemoShop(shopRepository, userRepository);
            ensureDemoBooks(categoryRepository, authorRepository, shopRepository, bookRepository, bookChapterRepository);
            ensureDemoVouchers(voucherRepository);
            ensureDemoClubs(bookClubRepository, clubMemberRepository, clubJoinRequestRepository,
                    userRepository, postRepository);
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
                                BookRepository bookRepository,
                                BookChapterRepository bookChapterRepository) {
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

        Book kieu = createBookIfMissing(bookRepository, authorRepository, "Nguyễn Du", vanHoc, shop, "Truyện Kiều",
                "Đoạn trường tân thanh - Kiệt tác văn học Việt Nam.",
                "https://images.unsplash.com/photo-1577985051167-0d49eec21977?auto=format&fit=crop&w=800&q=80",
                300, List.of("cổ điển", "văn học", "thơ"), new BigDecimal("0"), new BigDecimal("0"), 999);

        if (kieu != null) {
            kieu.setForSale(false);
            bookRepository.save(kieu);
            if (bookChapterRepository.countByBookId(kieu.getId()) == 0) {
                seedChapters(kieu.getId(), bookChapterRepository);
            }
        }
    }

    private void seedChapters(Long bookId, BookChapterRepository bookChapterRepository) {
        try {
            InputStream is = getClass().getResourceAsStream("/truyen_kieu.txt");
            if (is == null) return;
            String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            String[] lines = content.split("\\r?\\n");
            StringBuilder currentChapter = new StringBuilder();
            int chapterIndex = 0;
            int lineCount = 0;

            for (String line : lines) {
                if (line.trim().isEmpty()) continue;
                currentChapter.append(line.trim()).append("\n\n");
                lineCount++;
                if (lineCount >= 200) { // approx 200 verses per chapter
                    bookChapterRepository.save(BookChapter.builder()
                            .bookId(bookId)
                            .chapterIndex(chapterIndex)
                            .title("Phần " + (chapterIndex + 1))
                            .contentText(currentChapter.toString())
                            .build());
                    chapterIndex++;
                    currentChapter.setLength(0);
                    lineCount = 0;
                }
            }
            if (currentChapter.length() > 0) {
                bookChapterRepository.save(BookChapter.builder()
                        .bookId(bookId)
                        .chapterIndex(chapterIndex)
                        .title("Phần " + (chapterIndex + 1))
                        .contentText(currentChapter.toString())
                        .build());
            }
            System.out.println("Seeded Truyen Kieu chapters!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void ensureDemoClubs(BookClubRepository clubRepository,
                                 ClubMemberRepository memberRepository,
                                 ClubJoinRequestRepository joinRequestRepository,
                                 UserRepository userRepository,
                                 PostRepository postRepository) {
        User user1 = userRepository.findByUsernameIgnoreCase("user1").orElse(null);
        User user2 = userRepository.findByUsernameIgnoreCase("user2").orElse(null);
        User user3 = userRepository.findByUsernameIgnoreCase("user3").orElse(null);
        User user4 = userRepository.findByUsernameIgnoreCase("user4").orElse(null);
        if (user1 == null || user2 == null || user3 == null || user4 == null) {
            return;
        }

        BookClub literature = ensureClub(clubRepository,
                "Cùng đọc Văn học Việt",
                "Nơi những người yêu văn học Việt cùng đọc, chia sẻ cảm nhận và thảo luận về các tác phẩm kinh điển.",
                "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
                false,
                user1);
        ensureClubMember(memberRepository, literature, user1, ClubMember.Role.OWNER);
        ensureClubMember(memberRepository, literature, user2, ClubMember.Role.MEMBER);
        ensureClubMember(memberRepository, literature, user3, ClubMember.Role.MEMBER);
        if (postRepository.countByClubId(literature.getId()) == 0) {
            seedClubPost(postRepository, literature, user1,
                    "Cả nhà ơi, tháng này chúng ta cùng đọc Truyện Kiều nhé! Mình sẽ chia mỗi tuần 4 phần để mọi người kịp đọc và bàn luận.");
            seedClubPost(postRepository, literature, user2,
                    "Mình vừa đọc xong phần đầu. Ấn tượng nhất là cách Nguyễn Du khắc họa số phận con người qua từng câu thơ, càng đọc càng thấm.");
        }

        BookClub habit = ensureClub(clubRepository,
                "Thói quen đọc 20 phút mỗi ngày",
                "Cùng nhau xây dựng thói quen đọc sách mỗi ngày. Mục tiêu nhỏ, kiên trì dài lâu: 20 phút mỗi tối, không điện thoại.",
                "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80",
                false,
                user2);
        ensureClubMember(memberRepository, habit, user2, ClubMember.Role.OWNER);
        ensureClubMember(memberRepository, habit, user1, ClubMember.Role.MEMBER);
        ensureClubMember(memberRepository, habit, user4, ClubMember.Role.MEMBER);
        if (postRepository.countByClubId(habit.getId()) == 0) {
            seedClubPost(postRepository, habit, user2,
                    "Mục tiêu tuần này: mỗi tối 20 phút, không điện thoại. Ai tham gia thì điểm danh ở đây nhé!");
            seedClubPost(postRepository, habit, user4,
                    "Mình đã hoàn thành tối nay. Đang đọc Đời Sống Có Ý Nghĩa, khá hợp gu và dễ duy trì đều đặn.");
        }

        BookClub business = ensureClub(clubRepository,
                "Kinh doanh & Đầu tư (nhóm kín)",
                "Không gian riêng tư để các thành viên chia sẻ số liệu, bài học kinh doanh và cùng nhau giải bài toán tăng trưởng.",
                "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
                true,
                user3);
        ensureClubMember(memberRepository, business, user3, ClubMember.Role.OWNER);
        ensureClubMember(memberRepository, business, user1, ClubMember.Role.MEMBER);
        if (postRepository.countByClubId(business.getId()) == 0) {
            seedClubPost(postRepository, business, user3,
                    "Nhóm kín để mọi người thoải mái chia sẻ số liệu và bài học kinh doanh. Chào mừng mọi người và nhớ giữ tinh thần hỗ trợ lẫn nhau.");
        }
        boolean alreadyRequested = joinRequestRepository
                .findFirstByClub_IdAndUser_IdAndStatusOrderByCreatedAtDesc(
                        business.getId(), user2.getId(), ClubJoinRequest.Status.PENDING)
                .isPresent();
        if (!alreadyRequested && !memberRepository.existsByClub_IdAndUser_Id(business.getId(), user2.getId())) {
            joinRequestRepository.save(ClubJoinRequest.builder()
                    .club(business)
                    .user(user2)
                    .message("Mình muốn học hỏi thêm kinh nghiệm kinh doanh từ mọi người trong nhóm.")
                    .status(ClubJoinRequest.Status.PENDING)
                    .build());
        }
    }

    private BookClub ensureClub(BookClubRepository clubRepository,
                                String name,
                                String description,
                                String coverUrl,
                                boolean privateClub,
                                User owner) {
        return clubRepository.findFirstByNameIgnoreCase(name).orElseGet(() -> clubRepository.save(
                BookClub.builder()
                        .name(name)
                        .description(description)
                        .coverUrl(coverUrl)
                        .owner(owner)
                        .privateClub(privateClub)
                        .build()));
    }

    private void ensureClubMember(ClubMemberRepository memberRepository,
                                  BookClub club,
                                  User user,
                                  ClubMember.Role role) {
        if (memberRepository.existsByClub_IdAndUser_Id(club.getId(), user.getId())) {
            return;
        }
        memberRepository.save(ClubMember.builder()
                .id(new ClubMemberId(club.getId(), user.getId()))
                .club(club)
                .user(user)
                .role(role)
                .build());
    }

    private void seedClubPost(PostRepository postRepository, BookClub club, User author, String content) {
        postRepository.save(Post.builder()
                .user(author)
                .clubId(club.getId())
                .content(content)
                .visibility(Post.Visibility.CLUB_ONLY)
                .build());
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

    private Book createBookIfMissing(BookRepository bookRepository,
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
        Book existing = bookRepository.findAll().stream().filter(book -> book.getTitle().equalsIgnoreCase(title)).findFirst().orElse(null);
        if (existing != null) {
            return existing;
        }
        if (category == null || shop == null) {
            return null;
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

        return bookRepository.save(book);
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
                .emailVerified(true)
                .build();

        userRepository.save(user);
        System.out.println("Created account: " + normalizedUsername + " | role: " + role);
    }
}
