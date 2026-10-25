import { clearAuthToken, getAuthToken, notifyAuthExpired } from '../lib/authToken';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Phiên đã dùng token mà bị 401 nghĩa là token hết hạn/thu hồi — đăng xuất phía client. */
function handleUnauthorized(response, hadToken) {
  if (response.status === 401 && hadToken) {
    clearAuthToken();
    notifyAuthExpired();
  }
}

/** Upload ảnh bài viết từ máy người dùng lên backend. */
export async function uploadPostImage(file) {
  if (!file) throw new Error('Thiếu ảnh cần tải lên.');
  const formData = new FormData();
  formData.append('file', file);
  const hadToken = Boolean(getAuthToken());
  const response = await fetch(`${API_URL}/posts/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  handleUnauthorized(response, hadToken);
  const text = await response.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  if (!response.ok) throw new Error(data?.message || `Upload ảnh bài viết thất bại (HTTP ${response.status}).`);
  return data;
}

/** Upload ảnh đại diện bằng multipart/form-data, không đặt Content-Type thủ công. */
export async function uploadAvatar(file, userId) {
  if (!file || !userId) throw new Error('Thiếu ảnh hoặc thông tin tài khoản.');
  const formData = new FormData();
  formData.append('file', file);
  const hadToken = Boolean(getAuthToken());
  const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  handleUnauthorized(response, hadToken);
  const text = await response.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  if (!response.ok) throw new Error(data?.message || `Upload ảnh thất bại (HTTP ${response.status}).`);
  return data;
}

export function getApiErrorMessage(error) {
  if (!error) {
    return 'Không thể thực hiện yêu cầu.';
  }

  const raw =
    typeof error === 'string'
      ? error
      : error.message || String(error);

  if (/Failed to fetch|NetworkError|fetch.*failed/i.test(raw)) {
    return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend.';
  }

  return raw;
}

/**
 * Gọi API backend.
 *
 * Danh tính người dùng được gửi kèm bằng Bearer token; backend tự xác định
 * người đang đăng nhập, không nhận id do client cung cấp.
 */
export async function apiCall(
  endpoint,
  method = 'GET',
  body = null
) {
  const token = getAuthToken();
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  // Có body thì gửi JSON
  if (body !== null && body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    handleUnauthorized(response, Boolean(token));

    const text = await response.text();

    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    // Backend trả HTTP error
    if (!response.ok) {
      const httpMessage =
        typeof data === 'string'
          ? data
          : data?.message || `HTTP ${response.status}`;

      throw new Error(httpMessage);
    }

    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), {
      cause: error,
    });
  }
}

/* =========================================================
   POST
   ========================================================= */

export const postApi = {
  // Lấy tất cả bài viết
  getAll: (userId = null) =>
    apiCall('/posts', 'GET', null, { userId }),

  // Lấy bài viết của một user
  getByUser: (userId, currentUserId = null) =>
    apiCall(
      `/posts/user/${userId}`,
      'GET',
      null,
      { userId: currentUserId }
    ),

  // Tạo bài viết
  create: (body, userId) =>
    apiCall('/posts', 'POST', body, { userId }),

  // Like / Unlike bài viết
  toggleLike: (postId, userId) =>
    apiCall(
      `/posts/${postId}/like`,
      'POST',
      null,
      { userId }
    ),

  // Comment bài viết
  addComment: (postId, body, userId) =>
    apiCall(
      `/posts/${postId}/comments`,
      'POST',
      body,
      { userId }
    ),
};