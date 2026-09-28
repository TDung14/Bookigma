const PREFIX = 'bookigma.v1.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota hết hoặc trình duyệt chặn — bỏ qua, demo vẫn chạy trong bộ nhớ */
  }
}

/** Xoá toàn bộ dữ liệu demo để quay lại trạng thái gốc. */
export function resetAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* bỏ qua */
  }
}

export const uid = (prefix = 'id') =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
