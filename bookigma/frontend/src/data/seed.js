/**
 * Dữ liệu demo dự phòng khi backend chưa chạy hoặc đang bị tắt.
 * Giúp giao diện Shop/Feed/Login vẫn hoạt động trong môi trường demo.
 */

export const CATEGORIES = ['Tiểu thuyết', 'Khoa học', 'Kinh doanh', 'Thiếu nhi', 'Lịch sử'];

export const users = [
  {
    id: 1,
    username: 'user@bookigma.vn',
    email: 'user@bookigma.vn',
    fullName: 'Nguyễn Minh Châu',
    role: 'user',
    active: true,
    points: 820,
    createdAt: '2025-01-15T08:00:00',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: 2,
    username: 'shop@bookigma.vn',
    email: 'shop@bookigma.vn',
    fullName: 'Bookiga Studio',
    role: 'shop',
    active: true,
    points: 0,
    createdAt: '2025-01-12T09:00:00',
    avatarUrl: 'https://i.pravatar.cc/150?img=32',
  },
  {
    id: 3,
    username: 'admin@bookigma.vn',
    email: 'admin@bookigma.vn',
    fullName: 'Quản trị hệ thống',
    role: 'admin',
    active: true,
    points: 0,
    createdAt: '2024-12-01T12:00:00',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
  },
];

export const shops = [
  {
    id: 1,
    name: 'Skyline Books',
    ownerId: 2,
    avatar: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&q=80',
    description: 'Nơi gắn kết những cuốn sách tạo cảm hứng cho mỗi ngày.',
    rating: 4.9,
    followers: 12480,
    verified: true,
    joinedAt: '2024-12-01T00:00:00',
  },
  {
    id: 2,
    name: 'Lunar Press',
    ownerId: 4,
    avatar: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80',
    description: 'Sách mới, sáng tạo và phù hợp với người đọc trẻ.',
    rating: 4.7,
    followers: 9120,
    verified: true,
    joinedAt: '2024-11-15T00:00:00',
  },
];

export const books = [
  {
    id: 1,
    title: 'Đừng Ngại Khởi Đầu Lại',
    author: 'Mina Tran',
    category: 'Kinh doanh',
    shopId: 1,
    shopName: 'Skyline Books',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
    description: 'Cuốn sách giúp bạn nhìn lại những thách thức trong hành trình làm việc và bắt đầu lại với sự tự tin.',
    price: 128000,
    originalPrice: 169000,
    stock: 18,
    sold: 1240,
    rating: 4.8,
    ratingCount: 340,
    pages: 264,
    tags: ['phát triển bản thân', 'kinh doanh', 'làm chủ cuộc đời'],
    blindBook: false,
    status: 'active',
    chapterCount: 9,
    createdAt: 1719590000000,
  },
  {
    id: 2,
    title: 'Vũ Trụ Trong Một Chiếc Ly',
    author: 'Hà Phương',
    category: 'Khoa học',
    shopId: 1,
    shopName: 'Skyline Books',
    cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80',
    description: 'Khám phá những bí ẩn của khoa học và vũ trụ qua ngôn ngữ đơn giản, dễ hiểu cho mọi đối tượng.',
    price: 98000,
    originalPrice: 139000,
    stock: 24,
    sold: 980,
    rating: 4.7,
    ratingCount: 240,
    pages: 318,
    tags: ['khoa học', 'vũ trụ', 'khám phá'],
    blindBook: false,
    status: 'active',
    chapterCount: 10,
    createdAt: 1720510000000,
  },
  {
    id: 3,
    title: 'Cây Cầu Mặt Trời',
    author: 'Linh Đào',
    category: 'Tiểu thuyết',
    shopId: 2,
    shopName: 'Lunar Press',
    cover: 'https://images.unsplash.com/photo-1516979187454-437ec9d0a4d7?w=400&q=80',
    description: 'Một câu chuyện lãng mạn, sâu lắng về những người trẻ đi qua thời gian và yêu thương.',
    price: 149000,
    originalPrice: 199000,
    stock: 12,
    sold: 870,
    rating: 4.9,
    ratingCount: 520,
    pages: 410,
    tags: ['tiểu thuyết', 'tình cảm', 'hành trình'],
    blindBook: false,
    status: 'active',
    chapterCount: 12,
    createdAt: 1722570000000,
  },
  {
    id: 4,
    title: 'Thế Giới Trong Một Đêm',
    author: 'Phan Vũ',
    category: 'Thiếu nhi',
    shopId: 2,
    shopName: 'Lunar Press',
    cover: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80',
    description: 'Hành trình tưởng tượng cho các bé lớn lên qua những cuộc phiêu lưu vui nhộn và ý nghĩa.',
    price: 89000,
    originalPrice: 120000,
    stock: 30,
    sold: 1500,
    rating: 4.8,
    ratingCount: 310,
    pages: 146,
    tags: ['thiếu nhi', 'trẻ em', 'phiêu lưu'],
    blindBook: false,
    status: 'active',
    chapterCount: 8,
    createdAt: 1716170000000,
  },
  {
    id: 5,
    title: 'Hành Trình Của Những Vùng Đất',
    author: 'Thu Hà',
    category: 'Lịch sử',
    shopId: 1,
    shopName: 'Skyline Books',
    cover: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&q=80',
    description: 'Tái hiện những chặng đường lịch sử bằng cách kể chuyện gần gũi, dễ tiếp cận nhưng rất giàu cảm xúc.',
    price: 160000,
    originalPrice: 220000,
    stock: 16,
    sold: 660,
    rating: 4.6,
    ratingCount: 190,
    pages: 286,
    tags: ['lịch sử', 'du lịch', 'văn hóa'],
    blindBook: false,
    status: 'active',
    chapterCount: 7,
    createdAt: 1719300000000,
  },
];

export const posts = [];

export const exchanges = [];

export const vouchers = [
  { code: 'BOOK10', label: 'Giảm 10% cho đơn từ 200k', type: 'percent', value: 10, maxDiscount: 40000, minOrder: 200000 },
  { code: 'FREESHIP', label: 'Miễn phí ship', type: 'shipping', value: 0, maxDiscount: 0, minOrder: 150000 },
  { code: 'SAVE50K', label: 'Giảm 50.000đ', type: 'amount', value: 50000, maxDiscount: 50000, minOrder: 250000 },
];

export const orders = [];

export const reports = [];

export const conversations = [];

export const readingProgress = {};

export const redemptions = [];

export const notifications = [];