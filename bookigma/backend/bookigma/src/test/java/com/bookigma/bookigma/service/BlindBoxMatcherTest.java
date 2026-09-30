package com.bookigma.bookigma.service;

import com.bookigma.bookigma.entity.BlindBoxMood;
import com.bookigma.bookigma.entity.BlindBoxTier;
import com.bookigma.bookigma.entity.Book;
import com.bookigma.bookigma.entity.Category;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.random.RandomGenerator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BlindBoxMatcherTest {
    /** Luôn bốc phần tử đầu tiên của nhóm — tức cuốn điểm cao nhất — để test có kết quả cố định. */
    private static final RandomGenerator ALWAYS_FIRST = () -> 0L;

    private static Book book(long id, String title, String category, long price, double rating, String... tags) {
        return Book.builder()
                .id(id)
                .title(title)
                .category(Category.builder().name(category).build())
                .salePrice(BigDecimal.valueOf(price))
                .ratingAvg(BigDecimal.valueOf(rating))
                .ratingCount(1_000)
                .pageCount(300)
                .tags(new ArrayList<>(List.of(tags)))
                .status(Book.Status.ACTIVE)
                .build();
    }

    private final Book matBiec = book(4, "Mắt Biếc", "Văn học Việt Nam", 95_000, 4.9, "tình yêu", "tuổi thơ", "buồn");
    private final Book tuDuy = book(2, "Tư Duy Nhanh Và Chậm", "Tâm lý - Kỹ năng", 145_000, 4.8, "tâm lý học");
    private final Book atomic = book(6, "Atomic Habits", "Tâm lý - Kỹ năng", 139_000, 4.9, "thói quen", "năng suất");

    @Test
    void fitsMoodByCategoryOrTag() {
        assertTrue(BlindBoxMatcher.fitsMood(matBiec, BlindBoxMood.CRY));
        assertTrue(BlindBoxMatcher.fitsMood(atomic, BlindBoxMood.SKILL));
        assertFalse(BlindBoxMatcher.fitsMood(tuDuy, BlindBoxMood.CRY));
    }

    @Test
    void neverPicksABookThatDoesNotFitTheMoodEvenIfHighlyRated() {
        Optional<Book> picked = BlindBoxMatcher.pick(List.of(tuDuy, atomic), BlindBoxMood.CRY,
                BlindBoxTier.STANDARD, ALWAYS_FIRST);
        assertTrue(picked.isEmpty());
    }

    @Test
    void picksTheBestScoringBookForTheMood() {
        Optional<Book> picked = BlindBoxMatcher.pick(List.of(tuDuy, matBiec, atomic), BlindBoxMood.CRY,
                BlindBoxTier.STANDARD, ALWAYS_FIRST);
        assertEquals(Optional.of(matBiec), picked);
    }

    @Test
    void priceBandOfTheTierAddsScore() {
        double inBand = BlindBoxMatcher.score(atomic, BlindBoxMood.SKILL, BlindBoxTier.STANDARD);
        double outOfBand = BlindBoxMatcher.score(atomic, BlindBoxMood.SKILL, BlindBoxTier.MINI);
        assertEquals(3.0, inBand - outOfBand, 1e-9);
    }

    @Test
    void hintsDescribeTheBookWithoutRevealingItsTitle() {
        List<String> hints = BlindBoxMatcher.hints(matBiec);
        assertTrue(hints.contains("Thể loại: Văn học Việt Nam"));
        assertTrue(hints.stream().anyMatch(hint -> hint.contains("4.9★") && hint.contains("1.000 lượt")));
        assertTrue(hints.contains("Ba từ khoá: tình yêu · tuổi thơ · buồn"));
        assertTrue(hints.stream().noneMatch(hint -> hint.contains("Mắt Biếc")));
    }
}
