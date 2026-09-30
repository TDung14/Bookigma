const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

export function getApiErrorMessage(error) {
  if (!error) return 'Không thể thực hiện yêu cầu.';

  const raw = typeof error === 'string' ? error : error.message || String(error);

  if (/Failed to fetch|NetworkError|fetch.*failed/i.test(raw)) {
    return 'Không thể kết nối tới máy chủ. Hãy chắc chắn backend đang chạy ở http://localhost:8080.';
  }

  return raw;
}

/**
 * Gọi API backend. Truyền `userId` cho các API cần biết ai đang đăng nhập (giỏ hàng, đơn hàng...):
 * dự án chưa có JWT nên id được gửi qua header X-User-Id (backend đọc ở CurrentUserIdArgumentResolver).
 */
export async function apiCall(endpoint, method = 'GET', body = null, { userId } = {}) {
  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (userId !== null && userId !== undefined) {
    config.headers['X-User-Id'] = String(userId);
  }

  if (body !== null && body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const text = await response.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const httpMessage = typeof data === 'string'
        ? data
        : data?.message || `HTTP ${response.status}`;
      throw new Error(httpMessage);
    }

    return data;
  } catch (error) {
    
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
}