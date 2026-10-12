import { apiCall } from './api';

export const getFollowState = (userId) =>
  apiCall('/follows/state', 'GET', null, { userId });

export const toggleFollowUser = (userId, targetUserId) =>
  apiCall('/follows/toggle', 'POST', { targetUserId: Number(targetUserId) }, { userId });

export const getFollowSummary = (targetUserId, userId) =>
  apiCall(`/follows/users/${Number(targetUserId)}/summary`, 'GET', null, { userId });
