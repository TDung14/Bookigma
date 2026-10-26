import { apiCall } from './api';

export async function fetchTodayMissions() {
  return apiCall('/missions/today', 'GET');
}

export async function claimMission(taskId) {
  return apiCall(`/missions/${taskId}/claim`, 'POST');
}

export async function recordExplore(bookId) {
  return apiCall('/missions/explore', 'POST', { bookId });
}
