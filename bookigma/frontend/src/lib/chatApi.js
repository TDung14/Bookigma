const API_BASE = `${String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')}/api`;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Chat request failed (HTTP ${response.status})`;
    try { const parsed = JSON.parse(text); message = parsed.message || parsed.error || message; } catch {}
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function listChatConversations(userId) {
  return request(`/chat/conversations?userId=${userId}`);
}

export async function getConversationMessages(conversationId) {
  return request(`/chat/conversations/${conversationId}/messages`);
}

export async function createDirectConversation(userId, otherUserId) {
  return request('/chat/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ userId, otherUserId }),
  });
}

export async function createGroupConversation(payload) {
  return request('/chat/conversations/group', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createStrangerConversation(userId) {
  return request('/chat/conversations/stranger', {
    method: 'POST',
    body: JSON.stringify({ userId, name: 'Stranger chat' }),
  });
}

export async function sendChatMessage(conversationId, senderId, content) {
  return request(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderId, content }),
  });
}
