import { apiCall } from './api';

export async function getPointsSummary(userId) {
  return apiCall('/points/summary', 'GET', null, { userId });
}

export async function getPointsHistory(userId) {
  return apiCall('/points/history', 'GET', null, { userId });
}

export async function dailyCheckIn(userId) {
  return apiCall('/points/check-in', 'POST', null, { userId });
}

export async function addPointsApi(userId, amount, type = 'TASK_REWARD', description = 'Thưởng điểm') {
  return apiCall('/points/add', 'POST', { amount, type, description }, { userId });
}

export async function deductPointsApi(userId, amount, type = 'REDEEM', description = 'Dùng điểm') {
  return apiCall('/points/deduct', 'POST', { amount, type, description }, { userId });
}
