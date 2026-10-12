/**
 * API dành riêng cho chat.
 *
 * Thống nhất với src/services/api.js:
 * - VITE_API_URL là URL gốc backend, ví dụ https://api.example.com
 * - VITE_API_BASE_URL được hỗ trợ ngược để không làm hỏng cấu hình cũ;
 *   biến này có thể là URL gốc hoặc URL đã kết thúc bằng /api.
 */
const normalizeBaseUrl = () => {
  const legacyBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  const apiOrigin = String(import.meta.env.VITE_API_URL || '').trim();

  let base;
  if (legacyBase) {
    base = legacyBase.replace(/\/+$/, '');
    if (/\/api$/i.test(base)) { /* already has API prefix */ } else base += '/api';
  } else {
    base = (apiOrigin || 'http://localhost:8080').replace(/\/+$/, '');
    base += '/api';
  }

  return base;
};

const API_BASE = normalizeBaseUrl();

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      `Không thể kết nối API chat tại ${API_BASE}. Hãy kiểm tra VITE_API_URL/VITE_API_BASE_URL, CORS và trạng thái backend.`,
      { cause: error },
    );
  }

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data?.message || data?.detail || data?.error || `HTTP ${response.status}`;
    throw new Error(`Chat API (${response.status}): ${message}`);
  }

  if (response.status === 204 || !raw) return null;
  return data;
}

export async function listChatConversations(userId) {
  if (userId == null) throw new Error('Bạn cần đăng nhập để xem tin nhắn.');
  return request(`/chat/conversations?userId=${encodeURIComponent(userId)}`);
}

export async function getConversationMessages(conversationId) {
  return request(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export async function createDirectConversation(userId, otherUserId) {
  if (userId == null || otherUserId == null) {
    throw new Error('Thiếu ID người dùng khi tạo cuộc trò chuyện.');
  }
  return request('/chat/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ userId: Number(userId), otherUserId: Number(otherUserId) }),
  });
}

export async function createGroupConversation(payload) {
  if (!payload || payload.creatorId == null || !Array.isArray(payload.participantIds)) {
    throw new Error('Thông tin tạo nhóm chat không hợp lệ.');
  }
  return request('/chat/conversations/group', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      creatorId: Number(payload.creatorId),
      participantIds: payload.participantIds.map(Number),
    }),
  });
}

export async function createStrangerConversation(userId) {
  if (userId == null) throw new Error('Bạn cần đăng nhập để bắt đầu trò chuyện.');
  return request('/chat/conversations/stranger', {
    method: 'POST',
    body: JSON.stringify({ userId: Number(userId), name: 'Stranger chat' }),
  });
}

export async function sendChatMessage(conversationId, senderId, content) {
  const normalizedContent = String(content ?? '').trim();
  if (conversationId == null || senderId == null || !normalizedContent) {
    throw new Error('Tin nhắn hoặc thông tin người gửi không hợp lệ.');
  }
  return request(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderId: Number(senderId), content: normalizedContent }),
  });
}
