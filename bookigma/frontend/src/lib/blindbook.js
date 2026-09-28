/**
 * Blind Book — hộp sách bí ẩn.
 *
 * Theo báo cáo dự án, đây vừa là nguồn doanh thu B2C trực tiếp vừa là điểm khác
 * biệt nhắm vào sở thích bất ngờ của Gen Z. Người mua chọn tâm trạng và ngân
 * sách, hệ thống tự ghép một cuốn phù hợp nhưng **giấu tên sách** cho tới khi
 * đơn hàng được giao và người mua bấm mở hộp.
 *
 * Việc ghép sách dùng chính kho sách đang bán, nên hộp mở ra luôn là sách có thật.
 */

/** Ba mức hộp theo đúng khoảng giá 80.000đ - 250.000đ trong báo cáo. */
export const BOX_TIERS = [
  {
    id: 'mini', name: 'Hộp Mini', price: 80000, emoji: '📦',
    desc: '1 cuốn sách bất ngờ + 1 bookmark thiết kế riêng',
    perks: ['1 cuốn sách được chọn theo tâm trạng của bạn', 'Bookmark kim loại', 'Thiệp viết tay'],
  },
  {
    id: 'standard', name: 'Hộp Tiêu Chuẩn', price: 150000, emoji: '🎁',
    desc: '1 cuốn sách giá trị hơn + bộ quà nhỏ',
    perks: ['1 cuốn sách hạng trung, bìa đẹp', 'Bookmark + sticker bộ sưu tập', 'Thiệp viết tay', 'Gói quà riêng'],
  },
  {
    id: 'premium', name: 'Hộp Cao Cấp', price: 250000, emoji: '💎',
    desc: 'Sách bìa cứng / học thuật + full phụ kiện',
    perks: ['1 cuốn sách cao cấp hoặc học thuật', 'Bookmark kim loại + sticker', 'Sổ ghi chú đọc sách', 'Thiệp viết tay', 'Hộp quà cao cấp'],
  },
];

/**
 * Các "tâm trạng" người mua chọn. Mỗi tâm trạng ánh xạ sang thể loại và từ khoá
 * có thật trong kho sách, nhờ vậy kết quả ghép luôn hợp lý chứ không ngẫu nhiên mù.
 */
export const MOODS = [
  {
    id: 'motivation', emoji: '🔥', label: 'Cần động lực',
    desc: 'Đang chững lại và muốn có ai đó đẩy mình đi tiếp',
    categories: ['Truyền cảm hứng', 'Tâm lý - Kỹ năng'],
    tags: ['ước mơ', 'hành trình', 'thói quen', 'phát triển bản thân', 'tuổi trẻ'],
  },
  {
    id: 'cry', emoji: '💧', label: 'Muốn khóc một trận',
    desc: 'Một câu chuyện đủ đẹp và đủ buồn để chữa lành',
    categories: ['Văn học Việt Nam', 'Văn học nước ngoài'],
    tags: ['buồn', 'cảm động', 'tuổi thơ', 'tình yêu', 'gia đình'],
  },
  {
    id: 'skill', emoji: '🧠', label: 'Học một kỹ năng mới',
    desc: 'Đọc để dùng được ngay vào công việc và cuộc sống',
    categories: ['Tâm lý - Kỹ năng', 'Kinh tế'],
    tags: ['kỹ năng mềm', 'giao tiếp', 'năng suất', 'ra quyết định', 'thói quen'],
  },
  {
    id: 'escape', emoji: '🚀', label: 'Thoát khỏi thực tại',
    desc: 'Một thế giới khác để trốn vào vài tiếng đồng hồ',
    categories: ['Văn học nước ngoài', 'Thiếu nhi', 'Văn học Việt Nam'],
    tags: ['phiêu lưu', 'kinh điển', 'hành trình', 'tâm linh'],
  },
  {
    id: 'curious', emoji: '🔬', label: 'Tò mò về thế giới',
    desc: 'Khoa học, lịch sử, công nghệ — thứ gì đó làm mình ngạc nhiên',
    categories: ['Khoa học - Công nghệ'],
    tags: ['khoa học', 'lịch sử', 'công nghệ', 'xã hội', 'tiến hóa'],
  },
];

/** Giới hạn giá sách gợi ý cho từng mức hộp, để hộp cao cấp ra sách xứng tầm. */
const TIER_PRICE_BAND = {
  mini: [0, 100000],
  standard: [90000, 180000],
  premium: [140000, Infinity],
};

/**
 * Chọn cuốn sách sẽ nằm trong hộp.
 *
 * @param books    toàn bộ kho sách
 * @param moodId   tâm trạng người mua chọn
 * @param tierId   mức hộp
 * @param excludeIds sách người mua đã đọc hoặc đã mua — không nên ghép lại
 * @param seed     số ngẫu nhiên cố định để kết quả không đổi giữa các lần render
 */
export function pickBook(books, moodId, tierId, excludeIds = [], seed = 0) {
  const mood = MOODS.find((m) => m.id === moodId) || MOODS[0];
  const [min, max] = TIER_PRICE_BAND[tierId] || TIER_PRICE_BAND.mini;
  const exclude = new Set(excludeIds);

  const scored = books
    .filter((b) => b.status === 'active' && b.stock > 0 && !exclude.has(b.id))
    .map((b) => {
      let score = 0;
      if (mood.categories.includes(b.category)) score += 5;
      score += (b.tags || []).filter((t) => mood.tags.includes(t)).length * 2;
      if (b.price >= min && b.price <= max) score += 3;
      score += (b.rating - 4) * 2;
      return { book: b, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  // Lấy ngẫu nhiên trong nhóm phù hợp nhất để hai người cùng chọn một tâm trạng
  // vẫn có thể nhận hộp khác nhau — giữ đúng tinh thần "bất ngờ".
  const pool = scored.slice(0, Math.min(4, scored.length));
  return pool[seed % pool.length].book;
}

/**
 * Gợi ý hiển thị trên hộp chưa mở: đủ để người mua tò mò nhưng không đoán ra tên sách.
 */
export function boxHints(book) {
  if (!book) return [];
  const pages = book.pages <= 250 ? 'Dưới 250 trang — đọc gọn trong hai buổi tối'
    : book.pages <= 450 ? 'Khoảng 300-450 trang — đủ dày để đắm chìm'
    : 'Trên 450 trang — một cuốn để đọc thật lâu';
  return [
    `Thể loại: ${book.category}`,
    pages,
    `Cộng đồng chấm ${book.rating}★ từ ${book.ratingCount.toLocaleString('vi-VN')} lượt đánh giá`,
    `Ba từ khoá: ${(book.tags || []).slice(0, 3).join(' · ')}`,
  ];
}
