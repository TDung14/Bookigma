import { apiCall } from './api';
import { toNotification } from './mappers';

export const fetchNotifications = async (userId) =>
  (await apiCall(`/notifications/${userId}`)).map(toNotification);

export const markAllNotificationsRead = (userId) => apiCall(`/notifications/${userId}/read`, 'PATCH');
