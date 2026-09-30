/**
 * Chuyển dữ liệu từ API backend sang đúng "hình dạng" các trang đã dùng từ bản demo
 * (cover, status viết thường, thời gian dạng số mili giây...), để giao diện gần như không phải sửa.
 */

export const DEFAULT_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80';
export const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=12';

const num = (value) => (value === null || value === undefined ? 0 : Number(value));
const lower = (value) => (value ? String(value).toLowerCase() : null);

/**
 * Backend trả LocalDateTime dạng "2026-09-29T22:30:00.123456" (giờ Việt Nam, không kèm múi giờ).
 * Cắt phần lẻ giây còn 3 chữ số để mọi trình duyệt đều đọc được.
 */
export function toTime(value) {
  if (!value) return Date.now();
  const time = new Date(String(value).replace(/(\.\d{3})\d+/, '$1')).getTime();
  return Number.isNaN(time) ? Date.now() : time;
}

const toUser = (dto) => (dto ? { id: dto.id, name: dto.name, avatar: dto.avatarUrl || DEFAULT_AVATAR } : null);

export function toBook(dto) {
  const book = {
    id: dto.id,
    title: dto.title,
    author: dto.author || 'Đang cập nhật',
    category: dto.category || 'Khác',
    shopId: dto.shopId ?? null,
    shopName: dto.shopName || null,
    cover: dto.coverUrl || DEFAULT_COVER,
    description: dto.description || '',
    price: num(dto.price),
    originalPrice: dto.originalPrice === null || dto.originalPrice === undefined ? null : num(dto.originalPrice),
    stock: dto.stock ?? 0,
    sold: dto.sold ?? 0,
    rating: num(dto.rating),
    ratingCount: dto.ratingCount ?? 0,
    pages: dto.pages ?? 0,
    tags: dto.tags || [],
    status: lower(dto.status) || 'active',
    chapterCount: dto.chapterCount ?? 0,
    createdAt: toTime(dto.createdAt),
  };
  // Chỉ API chi tiết mới có nội dung chương.
  if (Array.isArray(dto.chapters)) {
    book.chapters = dto.chapters.map((chapter) => ({ title: chapter.title, paragraphs: chapter.paragraphs || [] }));
  }
  return book;
}

export const toShop = (dto) => ({
  id: dto.id,
  name: dto.name,
  ownerId: dto.ownerId,
  avatar: dto.avatarUrl || DEFAULT_AVATAR,
  description: dto.description || '',
  rating: num(dto.rating),
  followers: dto.followers ?? 0,
  verified: !!dto.verified,
  joinedAt: dto.createdAt,
});

export const toVoucher = (dto) => ({
  code: dto.code,
  label: dto.label,
  type: lower(dto.type), // percent | amount | shipping
  value: num(dto.value),
  maxDiscount: dto.maxDiscount === null || dto.maxDiscount === undefined ? Infinity : num(dto.maxDiscount),
  minOrder: num(dto.minOrder),
});

/** Hộp Blind Book như người mua nhìn thấy — không bao giờ có tên sách bên trong. */
export const toBlindBox = (dto) => (dto ? {
  boxId: dto.id,
  tierId: dto.tierId,
  tierName: dto.tierName,
  moodId: dto.moodId,
  moodLabel: dto.moodLabel,
  price: num(dto.price),
  status: lower(dto.status),
  hints: dto.hints || [],
} : null);

export function toCartLine(dto) {
  const blind = dto.type === 'BLIND_BOX' ? toBlindBox(dto.blindBox) : null;
  return {
    id: dto.id,
    qty: dto.quantity,
    available: dto.available !== false,
    unavailableReason: dto.unavailableReason || null,
    bookId: blind ? null : dto.bookId,
    blind,
    book: blind ? null : {
      id: dto.bookId,
      title: dto.title,
      author: dto.author,
      cover: dto.coverUrl || DEFAULT_COVER,
      price: num(dto.price),
      stock: dto.stock ?? 0,
      shopId: dto.shopId ?? null,
      shopName: dto.shopName || null,
    },
  };
}

export function toOrder(dto) {
  return {
    id: dto.id,
    code: dto.code,
    userId: dto.userId,
    buyerName: dto.buyerName,
    shopId: dto.shopId ?? null,
    shopName: dto.shopName || null,
    status: lower(dto.status),
    payment: lower(dto.paymentMethod),
    voucher: dto.voucherCode || null,
    note: dto.note || '',
    subtotal: num(dto.subtotal),
    shippingFee: num(dto.shippingFee),
    discount: num(dto.discount),
    total: num(dto.total),
    createdAt: toTime(dto.createdAt),
    address: { name: dto.recipientName, phone: dto.recipientPhone, detail: dto.shippingAddress },
    items: (dto.items || []).map((item) => ({
      id: item.id,
      // null khi là hộp Blind Book chưa mở (người mua chưa được biết là cuốn nào)
      bookId: item.bookId ?? null,
      title: item.title,
      author: item.author || null,
      cover: item.coverUrl || (item.bookId ? DEFAULT_COVER : null),
      price: num(item.price),
      qty: item.quantity,
      shopId: dto.shopId ?? null,
      blind: toBlindBox(item.blindBox),
      revealed: !!item.revealed,
    })),
    timeline: (dto.timeline || []).map((entry) => ({
      status: lower(entry.status),
      note: entry.note || '',
      at: toTime(entry.at),
    })),
  };
}

export function toOffer(dto) {
  return {
    id: dto.id,
    listingId: dto.listingId,
    listingTitle: dto.listingTitle,
    listingCover: dto.listingCoverUrl || DEFAULT_COVER,
    listingStatus: lower(dto.listingStatus),
    owner: toUser(dto.owner),
    sender: toUser(dto.sender),
    offeredBook: dto.offeredBook,
    message: dto.message || '',
    status: lower(dto.status), // pending | accepted | rejected | cancelled
    createdAt: toTime(dto.createdAt),
    respondedAt: dto.respondedAt ? toTime(dto.respondedAt) : null,
    contactEmail: dto.contactEmail || null,
  };
}

export function toListing(dto) {
  return {
    id: dto.id,
    bookTitle: dto.bookTitle,
    wanted: dto.wanted,
    condition: dto.condition,
    location: dto.location,
    cover: dto.coverUrl || DEFAULT_COVER,
    note: dto.note || '',
    status: lower(dto.status), // open | traded | closed
    createdAt: toTime(dto.createdAt),
    ownerId: dto.owner?.id ?? null,
    owner: toUser(dto.owner),
    pendingOffers: dto.pendingOffers ?? 0,
    myOfferStatus: lower(dto.myOfferStatus),
    offers: (dto.offers || []).map(toOffer),
  };
}

export const toNotification = (dto) => ({
  id: `srv-${dto.id}`,
  userId: dto.userId,
  text: dto.message,
  link: dto.link || '/',
  read: !!dto.read,
  at: toTime(dto.createdAt),
});
