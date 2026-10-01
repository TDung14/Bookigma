import { apiCall } from './api';

export const getFriendState = (userId) =>
  apiCall('/friends/state', 'GET', null, { userId });

export const sendFriendRequest = (userId, receiverId) =>
  apiCall('/friends/request', 'POST', { receiverId: Number(receiverId) }, { userId });

export const acceptFriendRequest = (userId, requesterId) =>
  apiCall('/friends/accept', 'POST', { requesterId: Number(requesterId) }, { userId });

export const rejectFriendRequest = (userId, requesterId) =>
  apiCall('/friends/reject', 'POST', { requesterId: Number(requesterId) }, { userId });

export const cancelFriendRequest = (userId, otherUserId) =>
  apiCall('/friends/cancel', 'POST', { otherUserId: Number(otherUserId) }, { userId });
