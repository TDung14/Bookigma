const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Chat request failed');
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
