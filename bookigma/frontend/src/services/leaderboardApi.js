import { apiCall } from './api';

export async function fetchLeaderboard() {
  return apiCall('/leaderboard', 'GET');
}
