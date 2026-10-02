package com.bookigma.bookigma.service;

import com.bookigma.bookigma.dto.BlindBoxResponseDto;
import com.bookigma.bookigma.dto.BookChapterDto;
import com.bookigma.bookigma.dto.BookResponseDto;
import com.bookigma.bookigma.dto.UserSummaryDto;
import com.bookigma.bookigma.entity.BlindBox;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.BookChapter;
import com.bookigma.bookigma.entity.Shop;
import com.bookigma.bookigma.entity.User;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Chuyển entity sang DTO trả cho frontend. Dùng chung giữa các service của Shop, Blind Book và Trao đổi. */
public final class DtoMapper {
    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    /** Các đoạn văn trong chương sách cách nhau bởi một dòng trống. */
    private static final Pattern PARAGRAPH_BREAK = Pattern.compile("\\R\\s*\\R");

    private DtoMapper() {
    }

    public static String lower(Enum<?> value) {
        return value == null ? null : value.name().toLowerCase(Locale.ROOT);
    }

    /** 100000 -> "100.000đ" */
    public static String formatVnd(BigDecimal amount) {
        return NumberFormat.getIntegerInstance(VIETNAMESE).format(amount == null ? 0 : amount) + "đ";
    }

    public static String formatCount(long value) {
        return NumberFormat.getIntegerInstance(VIETNAMESE).format(value);
    }

    public static String displayName(User user) {
        if (user == null) {
            return null;
        }
        return user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
    }

    public static UserSummaryDto toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        return UserSummaryDto.builder()
                .id(user.getId())
                .name(displayName(user))
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    public static BookResponseDto toBookDto(Book book) {
        return toBookDto(book, null);
    }

    public static BookResponseDto toBookDto(Book book, List<BookChapter> chapters) {
        Shop shop = book.getShop();
        return BookResponseDto.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor() == null ? null : book.getAuthor().getName())
                .category(book.getCategory() == null ? null : book.getCategory().getName())
                .shopId(shop == null ? null : shop.getId())
                .shopName(shop == null ? null : shop.getName())
                .coverUrl(book.getCoverImageUrl())
                .description(book.getDescription())
                .price(book.getSalePrice())
                .originalPrice(book.getOriginalPrice())
                .stock(book.getStockQuantity())
                .sold(book.getSoldCount())
                .rating(book.getRatingAvg())
                .ratingCount(book.getRatingCount())
                .pages(book.getPageCount())
                .tags(book.getTags() == null ? List.of() : List.copyOf(book.getTags()))
                .blindBook(Boolean.TRUE.equals(book.getBlindBook()))
                .status(lower(book.getStatus()))
                .chapterCount(book.getChapterCount() == null ? 0 : book.getChapterCount())
                .chapters(chapters == null ? null : chapters.stream().map(DtoMapper::toChapterDto).toList())
                .createdAt(book.getCreatedAt())
                .build();
    }

    private static BookChapterDto toChapterDto(BookChapter chapter) {
        String text = chapter.getContentText() == null ? "" : chapter.getContentText().strip();
        List<String> paragraphs = Arrays.stream(PARAGRAPH_BREAK.split(text))
                .map(String::strip)
                .filter(paragraph -> !paragraph.isEmpty())
                .toList();
        return BookChapterDto.builder()
                .index(chapter.getChapterIndex())
                .title(chapter.getTitle())
                .paragraphs(paragraphs)
                .build();
    }

    /** Thông tin hộp Blind Book — không bao giờ chứa tên cuốn sách bên trong. */
    public static BlindBoxResponseDto toBlindBoxDto(BlindBox box, List<String> hints) {
        return BlindBoxResponseDto.builder()
                .id(box.getId())
                .tierId(box.getTier().getId())
                .tierName(box.getTier().getLabel())
                .moodId(box.getMood().getId())
                .moodLabel(box.getMood().getLabel())
                .price(box.getPrice())
                .status(lower(box.getStatus()))
                .hints(hints)
                .build();
    }
}
