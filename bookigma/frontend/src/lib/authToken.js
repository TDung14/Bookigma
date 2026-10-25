import { load, remove, save } from './storage';

const TOKEN_KEY = 'authToken';

/** Phát ra khi backend trả 401 cho một request có token — phiên đã hết hiệu lực. */
export const AUTH_EXPIRED_EVENT = 'bookigma:auth-expired';

export function getAuthToken() {
  const token = load(TOKEN_KEY, null);
  return typeof token === 'string' && token.trim() ? token : null;
}

export function setAuthToken(token) {
  if (token) {
    save(TOKEN_KEY, token);
  } else {
    remove(TOKEN_KEY);
  }
}

export function clearAuthToken() {
  remove(TOKEN_KEY);
}

export function notifyAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}
