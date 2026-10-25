import { apiCall } from './api';
import { toNotification } from './mappers';

export const fetchNotifications = async () =>
  (await apiCall('/notifications')).map(toNotification);

export const markAllNotificationsRead = () => apiCall('/notifications/read', 'PATCH');
