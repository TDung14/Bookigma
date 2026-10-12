const API_ORIGIN = String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
export const DEFAULT_AVATAR = '/default-avatar.svg';

/** Chỉ hiển thị ảnh avatar đã upload lên backend. URL ảnh bên ngoài/URL cũ sẽ dùng avatar trắng mặc định. */
export function avatarSrc(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw === DEFAULT_AVATAR) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith('/uploads/avatars/')) return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
    } catch { /* dùng avatar mặc định */ }
    return DEFAULT_AVATAR;
  }
  if (raw.startsWith('/uploads/avatars/')) return `${API_ORIGIN}${raw}`;
  return DEFAULT_AVATAR;
}
