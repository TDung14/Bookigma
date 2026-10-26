import { clearAuthToken, getAuthToken, notifyAuthExpired } from '../lib/authToken';

const API_BASE = `${String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')}/api`;

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && token) {
    clearAuthToken();
    notifyAuthExpired();
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Chat request failed (HTTP ${response.status})`;
    try { const parsed = JSON.parse(text); message = parsed.message || parsed.error || message; } catch { /* body không phải JSON */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function listChatConversations() {
  return request('/chat/conversations');
}

export async function getConversationMessages(conversationId) {
  return request(`/chat/conversations/${conversationId}/messages`);
}

export async function createDirectConversation(otherUserId) {
  return request('/chat/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ otherUserId }),
  });
}

export async function createGroupConversation({ participantIds, name }) {
  return request('/chat/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ participantIds, name }),
  });
}

export async function createStrangerConversation() {
  return request('/chat/conversations/stranger', {
    method: 'POST',
  });
}

export async function createSupportConversation() {
  return request('/chat/conversations/support', {
    method: 'POST',
  });
}

export async function sendChatMessage(conversationId, content) {
  return request(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
