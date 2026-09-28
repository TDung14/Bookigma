/**
 * Bộ máy gợi ý của Bookigma.
 *
 * Đây là một mô hình content-based filtering chạy hoàn toàn ở phía client, đủ để demo
 * mà không cần backend. Khi có server, chỉ cần thay `getRecommendations` bằng một lời
 * gọi API — phần giao diện không phải sửa gì.
 *
 * Cách hoạt động:
 *  1. Dựng "hồ sơ khẩu vị" của người dùng từ hành vi thật trong app:
 *     tiến trình đọc, đơn hàng đã mua, sách trong giỏ, bài viết đã thích.
 *     Mỗi tín hiệu có trọng số khác nhau (đọc xong > mua > thích > xem).
 *  2. Cộng điểm cho thể loại, tác giả và từ khoá chủ đề của từng cuốn đã tương tác.
 *  3. Chấm điểm mọi cuốn sách chưa tương tác theo độ khớp với hồ sơ đó,
 *     cộng thêm điểm chất lượng (rating) và độ phổ biến (đã bán).
 *  4. Trả về danh sách đã xếp hạng kèm lý do giải thích được — điều mà một hệ gợi ý
 *     "hộp đen" không làm được, và cũng là thứ người dùng tin tưởng hơn.
 */

const SIGNAL_WEIGHT = {
  finished: 5.0,   // đọc xong
  reading: 3.0,    // đang đọc (nhân với % đã đọc)
  purchased: 3.5,  // đã mua
  cart: 2.0,       // đang trong giỏ
  liked: 1.5,      // thích bài viết về sách
};

const SCORE_WEIGHT = {
  category: 3.2,
  author: 2.4,
  tag: 1.1,
  rating: 1.4,
  popularity: 0.9,
  sameShop: 0.25,
};

/** Dựng hồ sơ khẩu vị từ hành vi của người dùng. */
export function buildTasteProfile({ books, progress = {}, orders = [], cart = [], posts = [], userId }) {
  const byId = Object.fromEntries(books.map((b) => [b.id, b]));
  const categories = {};
  const authors = {};
  const tags = {};
  const shops = {};
  const interacted = new Set();
  const signals = [];

  const addBook = (bookId, weight, kind) => {
    const book = byId[bookId];
    if (!book || weight <= 0) return;
    interacted.add(bookId);
    signals.push({ bookId, kind, weight, title: book.title });
    categories[book.category] = (categories[book.category] || 0) + weight;
    authors[book.author] = (authors[book.author] || 0) + weight;
    shops[book.shopId] = (shops[book.shopId] || 0) + weight * 0.5;
    (book.tags || []).forEach((t) => { tags[t] = (tags[t] || 0) + weight * 0.6; });
  };

  Object.values(progress).forEach((p) => {
    if (p.finished) addBook(p.bookId, SIGNAL_WEIGHT.finished, 'finished');
    else addBook(p.bookId, SIGNAL_WEIGHT.reading * (p.percent / 100), 'reading');
  });

  orders
    .filter((o) => o.userId === userId && o.status !== 'cancelled')
    .forEach((o) => o.items.forEach((it) => addBook(it.bookId, SIGNAL_WEIGHT.purchased, 'purchased')));

  cart.forEach((c) => addBook(c.bookId, SIGNAL_WEIGHT.cart, 'cart'));

  posts
    .filter((p) => p.bookId && (p.likedBy || []).includes(userId))
    .forEach((p) => addBook(p.bookId, SIGNAL_WEIGHT.liked, 'liked'));

  return { categories, authors, tags, shops, interacted, signals, byId };
}

const topKey = (map) =>
  Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

const normalize = (map) => {
  const max = Math.max(1, ...Object.values(map));
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v / max]));
};

/**
 * Trả về danh sách sách gợi ý đã xếp hạng, mỗi mục kèm `score` (0-100) và `reasons`.
 */
export function getRecommendations(input, limit = 8) {
  const { books } = input;
  const profile = buildTasteProfile(input);
  const cat = normalize(profile.categories);
  const auth = normalize(profile.authors);
  const tag = normalize(profile.tags);
  const shop = normalize(profile.shops);

  const hasHistory = profile.signals.length > 0;

  const scored = books
    .filter((b) => b.status === 'active' && !profile.interacted.has(b.id))
    .map((book) => {
      const reasons = [];
      let score = 0;

      const catScore = cat[book.category] || 0;
      if (catScore > 0) {
        score += catScore * SCORE_WEIGHT.category;
        const source = bestSourceFor(profile, (b) => b.category === book.category);
        reasons.push({
          icon: 'category',
          text: source
            ? `Cùng thể loại "${book.category}" với ${describeSignal(source)}`
            : `Khớp thể loại yêu thích: ${book.category}`,
        });
      }

      const authScore = auth[book.author] || 0;
      if (authScore > 0) {
        score += authScore * SCORE_WEIGHT.author;
        reasons.push({ icon: 'author', text: `Bạn đã đọc sách khác của ${book.author}` });
      }

      const sharedTags = (book.tags || []).filter((t) => tag[t] > 0);
      if (sharedTags.length) {
        const tagScore = sharedTags.reduce((s, t) => s + tag[t], 0) / sharedTags.length;
        score += tagScore * SCORE_WEIGHT.tag * Math.min(sharedTags.length, 3);
        reasons.push({ icon: 'tag', text: `Chủ đề quen thuộc: ${sharedTags.slice(0, 3).join(', ')}` });
      }

      const shopScore = shop[book.shopId] || 0;
      if (shopScore > 0) score += shopScore * SCORE_WEIGHT.sameShop;

      // Chất lượng và độ phổ biến — giúp người dùng mới vẫn nhận được gợi ý hợp lý.
      const ratingScore = (book.rating - 4) / 1;
      score += Math.max(0, ratingScore) * SCORE_WEIGHT.rating;
      score += Math.min(1, book.sold / 8000) * SCORE_WEIGHT.popularity;

      if (!reasons.length) {
        reasons.push({
          icon: 'trending',
          text: `Đang được cộng đồng đọc nhiều — ${book.rating}★ từ ${book.ratingCount.toLocaleString('vi-VN')} đánh giá`,
        });
      }

      return { book, rawScore: score, reasons };
    })
    .sort((a, b) => b.rawScore - a.rawScore);

  const max = scored[0]?.rawScore || 1;
  return {
    hasHistory,
    profile,
    topCategory: topKey(profile.categories),
    topAuthor: topKey(profile.authors),
    topTags: Object.entries(profile.tags).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t),
    items: scored.slice(0, limit).map((s) => ({
      ...s,
      score: Math.round(40 + (s.rawScore / max) * 59), // quy về thang 40-99 cho dễ đọc
    })),
  };
}

/** Tìm cuốn sách trong lịch sử có ảnh hưởng lớn nhất thoả điều kiện. */
function bestSourceFor(profile, predicate) {
  return profile.signals
    .filter((s) => predicate(profile.byId[s.bookId]))
    .sort((a, b) => b.weight - a.weight)[0];
}

function describeSignal(signal) {
  const map = {
    finished: `"${signal.title}" mà bạn đã đọc xong`,
    reading: `"${signal.title}" bạn đang đọc`,
    purchased: `"${signal.title}" bạn đã mua`,
    cart: `"${signal.title}" trong giỏ hàng`,
    liked: `"${signal.title}" bạn đã thích`,
  };
  return map[signal.kind] || `"${signal.title}"`;
}

/**
 * Trợ lý hỏi đáp về sách. Phân tích ý định từ câu hỏi rồi trả lời dựa trên
 * kho sách thật + hồ sơ khẩu vị, nên câu trả lời luôn khớp với dữ liệu đang hiển thị.
 */
export function askAssistant(question, ctx) {
  const q = question.toLowerCase();
  const { books } = ctx;
  const active = books.filter((b) => b.status === 'active');
  const rec = getRecommendations(ctx, 3);

  const matchCategory = (() => {
    const hit = active.find((b) => q.includes(b.category.toLowerCase().split(' - ')[0].toLowerCase()));
    return hit?.category || null;
  })();

  if (/(rẻ|giá rẻ|dưới|tiết kiệm|ít tiền|sinh viên)/.test(q)) {
    const cheap = [...active].sort((a, b) => a.price - b.price).slice(0, 3);
    return {
      text: 'Nếu bạn đang cần tiết kiệm, đây là ba cuốn có giá tốt nhất trên sàn mà vẫn được đánh giá cao:',
      books: cheap,
    };
  }
  if (/(hay nhất|đánh giá cao|nên đọc|best|top)/.test(q)) {
    const best = [...active].sort((a, b) => b.rating - a.rating).slice(0, 3);
    return { text: 'Ba cuốn được cộng đồng Bookigma chấm điểm cao nhất hiện nay:', books: best };
  }
  if (/(bán chạy|phổ biến|nhiều người|hot|trend)/.test(q)) {
    const hot = [...active].sort((a, b) => b.sold - a.sold).slice(0, 3);
    return { text: 'Đây là những cuốn đang bán chạy nhất tuần này:', books: hot };
  }
  if (/(ngắn|nhanh|mỏng|ít trang)/.test(q)) {
    const short = [...active].sort((a, b) => a.pages - b.pages).slice(0, 3);
    return { text: 'Sách mỏng, đọc trong 1-2 buổi là xong:', books: short };
  }
  if (matchCategory) {
    const inCat = active.filter((b) => b.category === matchCategory).slice(0, 3);
    return { text: `Một vài cuốn thuộc thể loại "${matchCategory}" bạn có thể thích:`, books: inCat };
  }
  if (/(đang đọc|tiếp tục|dở dang)/.test(q)) {
    const reading = Object.values(ctx.progress || {}).filter((p) => !p.finished && p.percent > 0);
    if (reading.length) {
      const list = reading
        .sort((a, b) => b.lastReadAt - a.lastReadAt)
        .map((p) => books.find((b) => b.id === p.bookId))
        .filter(Boolean)
        .slice(0, 3);
      return {
        text: `Bạn còn ${reading.length} cuốn đang đọc dở. Gần đây nhất là những cuốn này — bấm vào để đọc tiếp:`,
        books: list,
      };
    }
    return { text: 'Hiện bạn chưa có cuốn nào đang đọc dở. Thử bắt đầu với một trong các gợi ý dưới đây nhé:', books: rec.items.map((i) => i.book) };
  }

  return {
    text: rec.hasHistory
      ? `Dựa trên thói quen đọc của bạn (nhiều nhất là thể loại "${rec.topCategory}"), mình nghĩ bạn sẽ hợp với:`
      : 'Bạn chưa có lịch sử đọc nên mình gợi ý theo những cuốn được cộng đồng đánh giá cao nhất:',
    books: rec.items.map((i) => i.book),
  };
}

export const SUGGESTED_QUESTIONS = [
  'Có sách nào hay mà rẻ không?',
  'Gợi ý sách tâm lý cho mình',
  'Sách nào đang bán chạy?',
  'Mình còn cuốn nào đang đọc dở?',
  'Có sách nào mỏng đọc nhanh không?',
];
