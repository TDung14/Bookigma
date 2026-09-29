const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

export async function apiCall(endpoint, method = 'GET', body = null) {
  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body !== null && body !== undefined) {
    config.body = JSON.stringify(body);
  }

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
    const message = typeof data === 'string'
      ? data
      : data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}