import { currency } from './format';

/** Nhãn nguồn voucher hiển thị trên vé voucher. */
export const VOUCHER_SOURCE_LABEL = {
  public: 'Toàn sàn',
  reward: 'Đổi điểm',
  vip_perk: 'VIP',
  vip_daily: 'VIP hôm nay',
  vip_renewal: 'Gia hạn VIP',
};

const toTimestamp = (value) => {
  if (!value) return null;
  const time = new Date(String(value).replace(/(\.\d{3})\d+/, '$1')).getTime();
  return Number.isNaN(time) ? null : time;
};

/**
 * Voucher toàn sàn (catalog) và voucher cá nhân (ví) chuẩn hoá về cùng một dạng.
 * scope 'vip' là mã gia hạn: chỉ dùng khi mua VIP, không dùng cho đơn sách.
 */
export function normalizeVoucher(voucher) {
  const max = voucher.maxDiscount;
  return {
    code: String(voucher.code || ''),
    label: voucher.label || '',
    type: String(voucher.type || '').toLowerCase(), // percent | amount | shipping
    value: Number(voucher.value) || 0,
    maxDiscount: max === null || max === undefined || max === Infinity ? null : Number(max),
    minOrder: Number(voucher.minOrder) || 0,
    expiresAt: toTimestamp(voucher.expiresAt),
    source: String(voucher.source || (voucher.personal ? 'reward' : 'public')).toLowerCase(),
    scope: voucher.scope || 'order',
  };
}

export const isShippingVoucher = (voucher) => voucher?.type === 'shipping';

/** Tiền giảm của voucher giảm giá cho tạm tính, cùng công thức với OrderPricing ở backend. */
export function voucherDiscount(voucher, subtotal) {
  if (!voucher || subtotal <= 0 || isShippingVoucher(voucher)) return 0;
  let discount = 0;
  if (voucher.type === 'percent') {
    discount = Math.round((subtotal * voucher.value) / 100);
    if (voucher.maxDiscount !== null) discount = Math.min(discount, voucher.maxDiscount);
  } else if (voucher.type === 'amount') {
    discount = voucher.value;
  }
  return Math.max(0, Math.min(discount, subtotal));
}

/** Lý do chưa dùng được voucher cho đơn này, hoặc null nếu dùng được. */
export function voucherBlocker(voucher, subtotal, now = Date.now()) {
  if (voucher.expiresAt && voucher.expiresAt <= now) return 'Voucher đã hết hạn';
  if (subtotal < voucher.minOrder) return `Mua thêm ${currency(voucher.minOrder - subtotal)} để dùng voucher này`;
  return null;
}

/** Dòng tiêu đề như Shopee: "Giảm 20%", "Giảm 50.000đ", "Miễn phí vận chuyển". */
export function voucherTitle(voucher) {
  if (isShippingVoucher(voucher)) return 'Miễn phí vận chuyển';
  if (voucher.type === 'percent') return `Giảm ${voucher.value}%`;
  return `Giảm ${currency(voucher.value)}`;
}

export function voucherConditions(voucher) {
  const parts = [voucher.minOrder > 0 ? `Đơn tối thiểu ${currency(voucher.minOrder)}` : 'Mọi đơn hàng'];
  if (voucher.type === 'percent' && voucher.maxDiscount !== null) {
    parts.push(`Giảm tối đa ${currency(voucher.maxDiscount)}`);
  }
  return parts.join(' · ');
}

export function voucherExpiryText(voucher, now = Date.now()) {
  if (!voucher.expiresAt) return 'Không thời hạn';
  const left = voucher.expiresAt - now;
  if (left <= 0) return 'Đã hết hạn';
  if (left < 86_400_000) return `Sắp hết hạn: còn ${Math.max(1, Math.ceil(left / 3_600_000))} giờ`;
  return `HSD: ${new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}`;
}

/**
 * Voucher tốt nhất cho giỏ hiện tại: voucher giảm giá giảm nhiều nhất (bằng nhau thì ưu tiên mã
 * sắp hết hạn) và một voucher vận chuyển dùng được (nếu đơn còn phí ship).
 */
export function pickBestVouchers(vouchers, subtotal, shippingTotal, now = Date.now()) {
  let discount = null;
  let bestAmount = 0;
  let shipping = null;
  for (const voucher of vouchers) {
    if (voucherBlocker(voucher, subtotal, now)) continue;
    if (isShippingVoucher(voucher)) {
      if (shippingTotal > 0 && !shipping) shipping = voucher;
      continue;
    }
    const amount = voucherDiscount(voucher, subtotal);
    const soonerExpiry = discount && voucher.expiresAt
      && (!discount.expiresAt || voucher.expiresAt < discount.expiresAt);
    if (amount > bestAmount || (amount > 0 && amount === bestAmount && soonerExpiry)) {
      discount = voucher;
      bestAmount = amount;
    }
  }
  return { discount, shipping };
}
