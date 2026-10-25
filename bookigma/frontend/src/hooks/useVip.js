import { useMemo, useSyncExternalStore } from 'react';
import {
  VIP_EVENT, VIP_STORAGE_KEY, getVipPlan, isVipActive, vipDaysLeft,
} from '../lib/vip';

function subscribe(callback) {
  window.addEventListener(VIP_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(VIP_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(VIP_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/** Theo dõi trạng thái VIP của người dùng hiện tại và tự cập nhật khi gói thay đổi. */
export function useVip(userId) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '');

  return useMemo(() => {
    let records = {};
    if (raw) {
      try {
        records = JSON.parse(raw) || {};
      } catch {
        records = {};
      }
    }

    const record = userId === null || userId === undefined
      ? null
      : records?.[String(userId)] || null;
    const isVip = isVipActive(record);

    return {
      record,
      isVip,
      plan: isVip ? getVipPlan(record.planId) : null,
      daysLeft: vipDaysLeft(record),
      extraShelves: isVip ? record.extraShelves || 0 : 0,
      pointBonusPercent: isVip ? record.pointBonusPercent || 0 : 0,
      musicUnlocked: Boolean(isVip && record.musicUnlocked),
    };
  }, [raw, userId]);
}
