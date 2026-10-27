import { useCallback, useEffect, useState } from 'react';
import { getVipPerks } from '../services/perkApi';

/**
 * Quyền lợi VIP đang dùng được (lượt ebook tuần, lượt trao đổi miễn phí, voucher hôm nay...)
 * và luật quyền lợi do server quyết định. perks = null khi chưa tải xong hoặc chưa đăng nhập.
 */
export function useVipPerks(userId) {
  const [perks, setPerks] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    getVipPerks()
      .then((data) => { if (!cancelled) setPerks(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    try {
      const data = await getVipPerks();
      setPerks(data);
      return data;
    } catch {
      return null;
    }
  }, [userId]);

  return { perks, refresh };
}
