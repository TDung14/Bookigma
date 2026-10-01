import { apiCall } from './api';

export const fetchUsers = (adminId) =>
  apiCall('/admin/users', 'GET', null, { userId: adminId });

export const createUser = (adminId, body) =>
  apiCall('/admin/users', 'POST', body, { userId: adminId });

export const updateUser = (adminId, userId, body) =>
  apiCall(`/admin/users/${userId}`, 'PUT', body, { userId: adminId });

export const updateUserRole = (adminId, userId, role) =>
  apiCall(`/admin/users/${userId}/role`, 'PATCH', { role }, { userId: adminId });

export const updateUserStatus = (adminId, userId, active) =>
  apiCall(`/admin/users/${userId}/status`, 'PATCH', { active }, { userId: adminId });

export const deleteUser = (adminId, userId) =>
  apiCall(`/admin/users/${userId}`, 'DELETE', null, { userId: adminId });

export const fetchPosts = (adminId) =>
  apiCall('/admin/posts', 'GET', null, { userId: adminId });

export const deletePost = (adminId, postId) =>
  apiCall(`/admin/posts/${postId}`, 'DELETE', null, { userId: adminId });

export const fetchComments = (adminId, postId) =>
  apiCall(`/admin/posts/${postId}/comments`, 'GET', null, { userId: adminId });

export const deleteComment = (adminId, commentId) =>
  apiCall(`/admin/comments/${commentId}`, 'DELETE', null, { userId: adminId });
