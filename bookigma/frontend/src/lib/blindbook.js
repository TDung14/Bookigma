/**
 * Blind Book — hộp sách bí ẩn.
 *
 * Theo báo cáo dự án, đây vừa là nguồn doanh thu B2C trực tiếp vừa là điểm khác
 * biệt nhắm vào sở thích bất ngờ của Gen Z. Người mua chọn tâm trạng và ngân
 * sách, hệ thống tự ghép một cuốn phù hợp nhưng **giấu tên sách** cho tới khi
 * đơn hàng được giao và người mua bấm mở hộp.
 *
 * Việc ghép sách chạy ở backend (BlindBoxMatcher.java) để tên sách thật sự bí mật:
 * trình duyệt chỉ nhận về manh mối. File này chỉ giữ phần hiển thị; giá và id
 * phải khớp với BlindBoxTier.java / BlindBoxMood.java.
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
 * Các "tâm trạng" người mua chọn. Backend ánh xạ mỗi tâm trạng sang thể loại và từ khoá
 * có thật trong kho sách, nhờ vậy kết quả ghép luôn hợp lý chứ không ngẫu nhiên mù.
 */
export const MOODS = [
  { id: 'motivation', emoji: '🔥', label: 'Cần động lực', desc: 'Đang chững lại và muốn có ai đó đẩy mình đi tiếp' },
  { id: 'cry', emoji: '💧', label: 'Muốn khóc một trận', desc: 'Một câu chuyện đủ đẹp và đủ buồn để chữa lành' },
  { id: 'skill', emoji: '🧠', label: 'Học một kỹ năng mới', desc: 'Đọc để dùng được ngay vào công việc và cuộc sống' },
  { id: 'escape', emoji: '🚀', label: 'Thoát khỏi thực tại', desc: 'Một thế giới khác để trốn vào vài tiếng đồng hồ' },
  { id: 'curious', emoji: '🔬', label: 'Tò mò về thế giới', desc: 'Khoa học, lịch sử, công nghệ — thứ gì đó làm mình ngạc nhiên' },
];
