import { apiCall } from './api';

export const createReport = (userId, body) =>
  apiCall('/reports', 'POST', body, { userId });

export const fetchMyReports = (userId) =>
  apiCall('/reports/mine', 'GET', null, { userId });

export const fetchAdminReports = (adminId) =>
  apiCall('/admin/reports', 'GET', null, { userId: adminId });

export const resolveAdminReport = (adminId, reportId, body) =>
  apiCall(`/admin/reports/${reportId}`, 'PATCH', body, { userId: adminId });
