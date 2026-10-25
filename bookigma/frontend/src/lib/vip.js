import { load, save } from './storage';

export const VIP_EVENT = 'bookigma-vip-updated';
export const VIP_STORAGE_KEY = 'bookigma.v1.vip';

const DAY_MS = 86400000;

/**
 * Ba gói thành viên VIP. Quyền lợi trả phí được giữ ở đây để trang Nâng cấp,
 * trang Cài đặt và phần Góc đọc dùng chung một nguồn dữ liệu.
 */
export const VIP_PLANS = [
  {
    id: 'month',
    name: 'VIP 1 tháng',
    durationLabel: '1 tháng',
    price: 49000,
    days: 30,
    tagline: 'Một tháng đọc trọn vẹn, mở khoá toàn bộ không gian đọc.',
    points: 1000,
    pointBonusPercent: 0,
    extraShelves: 1,
    weeklyEbooks: 1,
    privileges: { bookDiscounts: 1, freeSwaps: 1, renewalCodes: 1 },
    popular: false,
  },
  {
    id: 'quarter',
    name: 'VIP 3 tháng',
    durationLabel: '3 tháng',
    price: 129000,
    days: 90,
    tagline: 'Ba tháng đọc sách, nhận thêm ưu đãi điểm mỗi ngày.',
    points: 3000,
    pointBonusPercent: 5,
    extraShelves: 1,
    weeklyEbooks: 1,
    privileges: { bookDiscounts: 2, freeSwaps: 3, renewalCodes: 2 },
    popular: true,
  },
  {
    id: 'year',
    name: 'VIP 1 năm',
    durationLabel: '1 năm',
    price: 399000,
    days: 365,
    tagline: 'Gói dài nhất với nhiều ưu đãi nhất trong cả năm đọc sách.',
    points: 5000,
    pointBonusPercent: 10,
    extraShelves: 2,
    weeklyEbooks: 1,
    privileges: { bookDiscounts: 14, freeSwaps: 12, renewalCodes: 3 },
    popular: false,
  },
];

const numberFormat = new Intl.NumberFormat('vi-VN');

export function getVipPlan(planId) {
  return VIP_PLANS.find((plan) => plan.id === planId) || null;
}

/** Danh sách quyền lợi hiển thị. Chức năng AI chưa triển khai nên không đưa vào bản giới thiệu. */
export function planPerkLabels(plan) {
  if (!plan) return [];
  return [
    `Tặng ${numberFormat.format(plan.points)} điểm Bookigma`,
    plan.pointBonusPercent > 0
      ? `Cộng thêm ${plan.pointBonusPercent}% mỗi lần nhận điểm`
      : null,
    `Nhận thêm ${plan.extraShelves} tủ sách trong Góc đọc`,
    `${plan.privileges.bookDiscounts} mã giảm giá khi mua sách`,
    `${plan.privileges.freeSwaps} lần trao đổi sách miễn phí`,
    `${plan.privileges.renewalCodes} mã giảm 10% cho lần nâng cấp sau`,
    'Mở khoá toàn bộ nhạc trong Góc đọc',
    'Nhận 1 sách ebook mỗi tuần',
  ].filter(Boolean);
}

export function readVipRecord(userId) {
  if (userId === null || userId === undefined) return null;
  const records = load('vip', {});
  return records?.[String(userId)] || null;
}

export function isVipActive(record) {
  return Boolean(record && Number(record.expiresAt) > Date.now());
}

export function vipDaysLeft(record) {
  if (!record) return 0;
  return Math.max(0, Math.ceil((Number(record.expiresAt) - Date.now()) / DAY_MS));
}

/** Bản ghi VIP còn hiệu lực, dùng cho các tiện ích đọc VIP. */
export function activeVip(userId) {
  const record = readVipRecord(userId);
  return isVipActive(record) ? record : null;
}

export function vipExtraShelves(userId) {
  return activeVip(userId)?.extraShelves || 0;
}

export function vipPointBonusPercent(userId) {
  return activeVip(userId)?.pointBonusPercent || 0;
}

export function vipMusicUnlocked(userId) {
  return Boolean(activeVip(userId)?.musicUnlocked);
}

/**
 * Đồng bộ trạng thái VIP từ backend vào cache localStorage để các phần khác
 * (tủ sách, nhạc, điểm) dùng chung. Backend là nguồn quyết định duy nhất.
 */
export function syncVipFromServer(userId, vip) {
  if (userId === null || userId === undefined) return null;
  const records = load('vip', {});
  const key = String(userId);
  const current = records?.[key] || null;
  const expiresAt = Number(vip?.expiresAtEpochMs || 0);
  const active = Boolean(vip?.active) && expiresAt > Date.now();

  let record = null;
  if (active) {
    const plan = getVipPlan(vip.planId);
    record = {
      planId: vip.planId,
      planName: vip.planName || plan?.name || 'Bookigma VIP',
      price: Number(vip.price || plan?.price || 0),
      days: Number(plan?.days || vip.daysLeft || 0),
      purchasedAt: Number(vip.startedAtEpochMs || Date.now()),
      startedAt: Number(vip.startedAtEpochMs || Date.now()),
      expiresAt,
      extraShelves: Number(vip.extraShelves || 0),
      pointBonusPercent: Number(vip.pointBonusPercent || 0),
      weeklyEbooks: Number(vip.weeklyEbooks || 0),
      musicUnlocked: Boolean(vip.musicUnlocked),
      privileges: {
        bookDiscounts: Number(vip.bookDiscounts || 0),
        freeSwaps: Number(vip.freeSwaps || 0),
        renewalCodes: Number(vip.renewalCodes || 0),
      },
      history: Array.isArray(current?.history) ? current.history : [],
    };
  }

  if (record) {
    save('vip', { ...records, [key]: record });
  } else if (current) {
    const next = { ...records };
    delete next[key];
    save('vip', next);
  }

  window.dispatchEvent(new CustomEvent(VIP_EVENT, { detail: { userId: key } }));
  return record;
}

