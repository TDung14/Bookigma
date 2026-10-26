import { apiCall } from './api';

/** Tiến trình đọc của người đang đăng nhập, đồng bộ giữa mọi thiết bị. */
export async function fetchProgress() {
  return apiCall('/progress', 'GET');
}

export async function updateProgress(bookId, patch) {
  return apiCall(`/progress/${bookId}`, 'PUT', patch);
}

export async function completeChapter(bookId, chapterIndex) {
  return apiCall(`/progress/${bookId}/chapters/${chapterIndex}/complete`, 'POST');
}
