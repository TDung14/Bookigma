import { apiCall } from './api';

/** Quyền lợi VIP đang dùng được + luật quyền lợi (phí trao đổi, giá mở ebook, tốc độ đọc...). */
export const getVipPerks = () => apiCall('/vip/perks', 'GET');

/** VIP nhận voucher giảm ngẫu nhiên 10-30% của hôm nay. */
export const claimDailyVoucher = () => apiCall('/vip/perks/daily-voucher', 'POST');

/** Mở khoá ebook premium: method 'points' (trừ điểm) hoặc 'vip' (lượt miễn phí trong tuần). */
export const unlockEbook = (bookId, method) => apiCall(`/ebooks/${bookId}/unlock`, 'POST', { method });

export const fetchUnlockedEbooks = () => apiCall('/ebooks/unlocked', 'GET');
