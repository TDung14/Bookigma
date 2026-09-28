/**
 * Hệ thống Gamification của Bookigma.
 *
 * Báo cáo dự án xác định đây là "hook quan trọng nhất" giữ chân người đọc:
 * 43,8% người khảo sát mong muốn có hệ thống tích điểm đổi thưởng để duy trì
 * kỷ luật đọc. Toàn bộ điểm số ở đây đều sinh ra từ hành vi thật trong app
 * (đọc sách, đăng bài, mua hàng) chứ không phải số cứng.
 *
 * Bốn thành phần: điểm Gigma, cấp độ người đọc, nhiệm vụ hằng ngày, và thú ảo.
 */

/** Điểm thưởng cho từng hành vi. Mọi nơi cộng điểm đều phải dùng hằng số ở đây. */
export const POINT_RULES = {
  readMinute: 2,        // mỗi phút đọc thực tế
  finishChapter: 30,    // đọc xong một chương
  finishBook: 200,      // đọc xong cả cuốn
  createPost: 15,
  createComment: 5,
  placeOrder: 50,
  exchangeOffer: 20,
  dailyStreak: 25,      // thưởng thêm mỗi ngày giữ được chuỗi
};

/* ------------------------------------------------------------------ */
/*  Cấp độ                                                             */
/* ------------------------------------------------------------------ */

/** Mốc điểm tích luỹ để lên từng cấp. Càng lên cao khoảng cách càng xa. */
export const xpForLevel = (level) => Math.round(120 * level ** 1.45);

export function levelFromPoints(totalPoints) {
  let level = 1;
  while (level < 50 && totalPoints >= xpForLevel(level)) level += 1;
  const current = level === 1 ? 0 : xpForLevel(level - 1);
  const next = xpForLevel(level);
  return {
    level,
    current: totalPoints - current,
    needed: next - current,
    percent: Math.min(100, Math.round(((totalPoints - current) / (next - current)) * 100)),
  };
}

export const LEVEL_TITLES = [
  { min: 1, title: 'Người mới bắt đầu' },
  { min: 3, title: 'Mọt sách tập sự' },
  { min: 5, title: 'Độc giả chăm chỉ' },
  { min: 8, title: 'Mọt Sách Bạc' },
  { min: 12, title: 'Mọt Sách Vàng' },
  { min: 16, title: 'Bậc thầy tri thức' },
];

export const titleForLevel = (level) =>
  [...LEVEL_TITLES].reverse().find((t) => level >= t.min)?.title || LEVEL_TITLES[0].title;

/* ------------------------------------------------------------------ */
/*  Thú ảo                                                             */
/* ------------------------------------------------------------------ */

/**
 * Thú ảo lớn lên bằng chính thời gian đọc của chủ nhân, và có thể cho ăn
 * bằng điểm Gigma. Mỗi giai đoạn mở ra khi thú tích đủ điểm kinh nghiệm.
 */
export const PET_STAGES = [
  { min: 0, name: 'Trứng sách', emoji: '🥚', desc: 'Đọc thêm để trứng nở nhé!' },
  { min: 120, name: 'Mọt con', emoji: '🐛', desc: 'Vừa nở, đang tò mò về thế giới chữ nghĩa.' },
  { min: 400, name: 'Mọt sách', emoji: '🐌', desc: 'Đã biết gặm sách, gặm rất chậm nhưng chắc.' },
  { min: 900, name: 'Cú đọc đêm', emoji: '🦉', desc: 'Thức khuya đọc cùng bạn, rất tinh mắt.' },
  { min: 1800, name: 'Cáo hiền triết', emoji: '🦊', desc: 'Đọc nhanh, nhớ lâu, hay trích dẫn danh ngôn.' },
  { min: 3200, name: 'Rồng tri thức', emoji: '🐉', desc: 'Dạng tiến hoá cuối. Canh giữ kho tàng sách của bạn.' },
];

export const FEED_COST = 40;
export const FEED_XP = 55;

export function petStage(xp) {
  const idx = PET_STAGES.reduce((acc, s, i) => (xp >= s.min ? i : acc), 0);
  const stage = PET_STAGES[idx];
  const next = PET_STAGES[idx + 1];
  return {
    ...stage,
    index: idx,
    next,
    percent: next ? Math.min(100, Math.round(((xp - stage.min) / (next.min - stage.min)) * 100)) : 100,
  };
}

/** Thú đói dần theo thời gian — cho ăn để giữ tinh thần, ảnh hưởng tới lời thoại. */
export function petMood(lastFed) {
  const hours = (Date.now() - (lastFed || 0)) / 3600000;
  if (hours < 6) return { label: 'Vui vẻ', emoji: '😊', badge: 'badge-green' };
  if (hours < 24) return { label: 'Bình thường', emoji: '🙂', badge: 'badge-blue' };
  if (hours < 48) return { label: 'Hơi đói', emoji: '😐', badge: 'badge-amber' };
  return { label: 'Đang đói', emoji: '🥺', badge: 'badge-red' };
}

/* ------------------------------------------------------------------ */
/*  Nhiệm vụ hằng ngày                                                 */
/* ------------------------------------------------------------------ */

export const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Bốn nhiệm vụ cố định mỗi ngày, tự đặt lại lúc nửa đêm.
 * `metric` là tên bộ đếm mà các trang khác sẽ tăng lên khi người dùng thao tác.
 */
export const DAILY_TASKS = [
  { id: 'read10', metric: 'readMinutes', goal: 10, reward: 40, label: 'Đọc sách 10 phút', hint: 'Mở bất kỳ cuốn nào trong tủ sách' },
  { id: 'chapter', metric: 'chapters', goal: 1, reward: 50, label: 'Đọc xong 1 chương', hint: 'Bấm "Chương sau" khi đọc hết' },
  { id: 'social', metric: 'social', goal: 1, reward: 25, label: 'Đăng bài hoặc bình luận', hint: 'Chia sẻ cảm nhận trên bảng tin' },
  { id: 'explore', metric: 'explore', goal: 3, reward: 20, label: 'Khám phá 3 cuốn sách mới', hint: 'Mở trang chi tiết của 3 cuốn khác nhau' },
];

export function taskState(daily) {
  const counters = daily?.counters || {};
  const claimed = daily?.claimed || [];
  return DAILY_TASKS.map((t) => {
    const progress = Math.min(t.goal, counters[t.metric] || 0);
    return {
      ...t,
      progress,
      percent: Math.round((progress / t.goal) * 100),
      done: progress >= t.goal,
      claimed: claimed.includes(t.id),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Huy hiệu                                                           */
/* ------------------------------------------------------------------ */

/**
 * Huy hiệu được tính lại từ số liệu thật mỗi lần hiển thị, nên không thể
 * lệch với dữ liệu — không cần lưu trạng thái "đã mở khoá" ở đâu cả.
 */
export const BADGES = [
  { id: 'first_book', emoji: '📖', name: 'Trang đầu tiên', desc: 'Mở cuốn sách đầu tiên', test: (s) => s.booksStarted >= 1 },
  { id: 'finisher', emoji: '🏁', name: 'Người về đích', desc: 'Đọc xong 1 cuốn sách', test: (s) => s.booksFinished >= 1 },
  { id: 'bookworm', emoji: '🐛', name: 'Mọt thứ thiệt', desc: 'Đọc xong 3 cuốn sách', test: (s) => s.booksFinished >= 3 },
  { id: 'marathon', emoji: '⏳', name: 'Đọc bền bỉ', desc: 'Tổng thời gian đọc đạt 5 giờ', test: (s) => s.secondsRead >= 5 * 3600 },
  { id: 'streak3', emoji: '🔥', name: 'Chuỗi 3 ngày', desc: 'Giữ chuỗi đọc 3 ngày liên tiếp', test: (s) => s.streak >= 3 },
  { id: 'streak7', emoji: '💎', name: 'Kỷ luật 7 ngày', desc: 'Giữ chuỗi đọc 7 ngày liên tiếp', test: (s) => s.streak >= 7 },
  { id: 'social', emoji: '💬', name: 'Người kết nối', desc: 'Đăng 3 bài viết trên bảng tin', test: (s) => s.posts >= 3 },
  { id: 'collector', emoji: '📚', name: 'Nhà sưu tầm', desc: 'Mua sách 3 đơn hàng', test: (s) => s.orders >= 3 },
  { id: 'exchanger', emoji: '🔄', name: 'Người sẻ chia', desc: 'Đăng tin trao đổi sách', test: (s) => s.exchanges >= 1 },
  { id: 'blindbox', emoji: '🎁', name: 'Kẻ ưa bất ngờ', desc: 'Mở một hộp Blind Book', test: (s) => s.blindBoxes >= 1 },
];

export const evaluateBadges = (stats) =>
  BADGES.map((b) => ({ ...b, earned: b.test(stats) }));

/* ------------------------------------------------------------------ */
/*  Đổi thưởng                                                         */
/* ------------------------------------------------------------------ */

/**
 * Báo cáo nhấn mạnh phần thưởng phải là lợi ích hữu hình (voucher, sách,
 * quà thật) chứ không chỉ là danh hiệu ảo, nếu không sẽ không giữ được người dùng.
 */
export const REWARDS = [
  { id: 'petfood', emoji: '🍪', name: 'Bánh cho thú ảo', desc: 'Một phần ăn giúp thú tăng 55 EXP', cost: 40, type: 'pet' },
  { id: 'bookmark', emoji: '🔖', name: 'Bookmark kim loại', desc: 'Quà thật, giao kèm đơn hàng kế tiếp', cost: 300, type: 'physical' },
  { id: 'voucher20', emoji: '🎟️', name: 'Voucher 20.000đ', desc: 'Áp dụng cho đơn từ 100.000đ', cost: 500, type: 'voucher', value: 20000 },
  { id: 'tote', emoji: '👜', name: 'Túi tote Bookigma', desc: 'Quà thật, bản giới hạn', cost: 1200, type: 'physical' },
  { id: 'voucher50', emoji: '🎫', name: 'Voucher 50.000đ', desc: 'Áp dụng cho đơn từ 200.000đ', cost: 1400, type: 'voucher', value: 50000 },
  { id: 'freebook', emoji: '📗', name: 'Một cuốn sách dưới 100.000đ', desc: 'Tự chọn trong cửa hàng', cost: 3000, type: 'physical' },
];

/* ------------------------------------------------------------------ */
/*  Thống kê dùng chung                                                */
/* ------------------------------------------------------------------ */

/** Gom toàn bộ số liệu cần cho huy hiệu và bảng thành tích từ dữ liệu gốc. */
export function collectStats({ user, progress = {}, orders = [], posts = [], exchanges = [] }) {
  const entries = Object.values(progress);
  return {
    booksStarted: entries.length,
    booksFinished: entries.filter((e) => e.finished).length,
    secondsRead: entries.reduce((s, e) => s + (e.secondsRead || 0), 0),
    streak: user?.streak || 0,
    posts: posts.filter((p) => p.authorId === user?.id).length,
    orders: orders.filter((o) => o.userId === user?.id && o.status !== 'cancelled').length,
    exchanges: exchanges.filter((e) => e.ownerId === user?.id).length,
    blindBoxes: orders
      .filter((o) => o.userId === user?.id)
      .reduce((s, o) => s + o.items.filter((i) => i.blind && i.revealed).length, 0),
  };
}
