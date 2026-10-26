import { apiCall } from './api';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value).trim());
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function fetchClubs({ q = '', scope = 'all' } = {}) {
  return apiCall(`/clubs${queryString({ q, scope })}`, 'GET');
}

export function fetchClub(clubId) {
  return apiCall(`/clubs/${clubId}`, 'GET');
}

export function createClub(payload) {
  return apiCall('/clubs', 'POST', payload);
}

export function updateClub(clubId, payload) {
  return apiCall(`/clubs/${clubId}`, 'PATCH', payload);
}

export function joinClub(clubId, message = '') {
  return apiCall(`/clubs/${clubId}/join`, 'POST', { message: message || null });
}

export function leaveClub(clubId) {
  return apiCall(`/clubs/${clubId}/leave`, 'DELETE');
}

export function cancelJoinRequest(clubId) {
  return apiCall(`/clubs/${clubId}/requests/me`, 'DELETE');
}

export function updateMemberRole(clubId, memberUserId, role) {
  return apiCall(`/clubs/${clubId}/members/${memberUserId}`, 'PATCH', { role });
}

export function removeClubMember(clubId, memberUserId) {
  return apiCall(`/clubs/${clubId}/members/${memberUserId}`, 'DELETE');
}

export function fetchClubMembers(clubId) {
  return apiCall(`/clubs/${clubId}/members`, 'GET');
}

export function fetchClubPosts(clubId) {
  return apiCall(`/clubs/${clubId}/posts`, 'GET');
}

export function createClubPost(clubId, payload) {
  return apiCall(`/clubs/${clubId}/posts`, 'POST', payload);
}

export function fetchJoinRequests(clubId) {
  return apiCall(`/clubs/${clubId}/requests`, 'GET');
}

export function approveJoinRequest(clubId, requestId) {
  return apiCall(`/clubs/${clubId}/requests/${requestId}/approve`, 'POST', {});
}

export function rejectJoinRequest(clubId, requestId) {
  return apiCall(`/clubs/${clubId}/requests/${requestId}/reject`, 'POST', {});
}
