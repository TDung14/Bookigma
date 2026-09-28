export const currency = (n) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';

export const compactNumber = (n) =>
  new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

export function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

export const dateTime = (ts) =>
  new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const dateOnly = (ts) =>
  new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const clockTime = (ts) =>
  new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function duration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

/** Nhãn và màu cho trạng thái đơn hàng. */
export const ORDER_STATUS = {
  pending: { label: 'Chờ xác nhận', badge: 'badge-amber' },
  confirmed: { label: 'Đã xác nhận', badge: 'badge-blue' },
  shipping: { label: 'Đang giao', badge: 'badge-purple' },
  delivered: { label: 'Đã giao', badge: 'badge-green' },
  completed: { label: 'Hoàn thành', badge: 'badge-green' },
  cancelled: { label: 'Đã hủy', badge: 'badge-red' },
};

export const ORDER_FLOW = ['pending', 'confirmed', 'shipping', 'delivered', 'completed'];

export const PAYMENT_LABEL = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank: 'Chuyển khoản ngân hàng',
  momo: 'Ví MoMo',
};

export const REPORT_STATUS = {
  pending: { label: 'Chờ xử lý', badge: 'badge-amber' },
  resolved: { label: 'Đã xử lý', badge: 'badge-green' },
  rejected: { label: 'Đã từ chối', badge: 'badge-red' },
};

export const REPORT_TYPE = {
  post: 'Bài đăng',
  book: 'Sản phẩm',
  user: 'Người dùng',
  comment: 'Bình luận',
  exchange: 'Tin trao đổi',
};
