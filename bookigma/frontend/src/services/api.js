const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

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
 * Dự án hiện chưa sử dụng JWT.
 * Với các API cần xác định người dùng đang đăng nhập,
 * frontend gửi userId qua header X-User-Id.
 */
export async function apiCall(
  endpoint,
  method = 'GET',
  body = null,
  { userId } = {}
) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Gửi ID người dùng nếu API cần xác định người đang đăng nhập
  if (userId !== null && userId !== undefined) {
    config.headers['X-User-Id'] = String(userId);
  }

  // Có body thì gửi JSON
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