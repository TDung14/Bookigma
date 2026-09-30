package com.bookigma.bookigma.service;

import com.bookigma.bookigma.entity.BlindBoxMood;
import com.bookigma.bookigma.entity.BlindBoxTier;
import com.bookigma.bookigma.entity.Book;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.random.RandomGenerator;

/**
 * Thuật toán ghép sách cho hộp Blind Book.
 *
 * Chỉ những cuốn khớp tâm trạng (đúng thể loại hoặc có ít nhất một từ khoá) mới được xét, rồi
 * chấm điểm thêm theo khoảng giá của mức hộp và điểm đánh giá. Hộp lấy ngẫu nhiên trong nhóm
 * điểm cao nhất, nên hai người cùng chọn một tâm trạng vẫn có thể nhận hộp khác nhau — đúng
 * tinh thần "bất ngờ" nhưng không ngẫu nhiên mù.
 */
public final class BlindBoxMatcher {
    /** Số cuốn điểm cao nhất được đưa vào vòng bốc ngẫu nhiên. */
    static final int POOL_SIZE = 4;

    private BlindBoxMatcher() {
    }

    /** Cuốn sách có liên quan tới tâm trạng hay không (thể loại hoặc từ khoá trùng). */
    public static boolean fitsMood(Book book, BlindBoxMood mood) {
        String category = book.getCategory() == null ? null : book.getCategory().getName();
        if (category != null && mood.getCategories().contains(category)) {
            return true;
        }
        List<String> tags = book.getTags() == null ? List.of() : book.getTags();
        return tags.stream().anyMatch(mood.getTags()::contains);
    }

    public static double score(Book book, BlindBoxMood mood, BlindBoxTier tier) {
        double score = 0;
        String category = book.getCategory() == null ? null : book.getCategory().getName();
        if (category != null && mood.getCategories().contains(category)) {
            score += 5;
        }
        List<String> tags = book.getTags() == null ? List.of() : book.getTags();
        score += tags.stream().filter(mood.getTags()::contains).count() * 2;
        if (tier.fitsPrice(book.getSalePrice())) {
            score += 3;
        }
        double rating = book.getRatingAvg() == null ? 0 : book.getRatingAvg().doubleValue();
        score += (rating - 4) * 2;
        return score;
    }

    /** Chọn cuốn sẽ nằm trong hộp; rỗng nếu không cuốn nào phù hợp. */
    public static Optional<Book> pick(Collection<Book> candidates,
                                      BlindBoxMood mood,
                                      BlindBoxTier tier,
                                      RandomGenerator random) {
        record Scored(Book book, double score) {
        }

        List<Book> pool = candidates.stream()
                .filter(book -> fitsMood(book, mood))
                .map(book -> new Scored(book, score(book, mood, tier)))
                .filter(scored -> scored.score() > 0)
                .sorted(Comparator.comparingDouble(Scored::score).reversed()
                        .thenComparing(scored -> scored.book().getId()))
                .limit(POOL_SIZE)
                .map(Scored::book)
                .toList();

        if (pool.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(pool.get(random.nextInt(pool.size())));
    }

    /** Manh mối in trên hộp chưa mở: đủ để tò mò nhưng không đoán ra tên sách. */
    public static List<String> hints(Book book) {
        List<String> hints = new ArrayList<>();
        if (book.getCategory() != null) {
            hints.add("Thể loại: " + book.getCategory().getName());
        }

        int pages = book.getPageCount() == null ? 0 : book.getPageCount();
        if (pages <= 250) {
            hints.add("Dưới 250 trang — đọc gọn trong hai buổi tối");
        } else if (pages <= 450) {
            hints.add("Khoảng 300-450 trang — đủ dày để đắm chìm");
        } else {
            hints.add("Trên 450 trang — một cuốn để đọc thật lâu");
        }

        Integer ratingCount = book.getRatingCount();
        if (book.getRatingAvg() != null && ratingCount != null && ratingCount > 0) {
            String rating = book.getRatingAvg().setScale(1, RoundingMode.HALF_UP).toPlainString();
            hints.add("Cộng đồng chấm " + rating + "★ từ " + DtoMapper.formatCount(ratingCount) + " lượt đánh giá");
        }

        List<String> tags = book.getTags() == null ? List.of() : book.getTags();
        if (!tags.isEmpty()) {
            hints.add("Ba từ khoá: " + String.join(" · ", tags.subList(0, Math.min(3, tags.size()))));
        }
        return hints;
    }
}
