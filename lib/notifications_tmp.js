import { apiRequest } from "./api";

export const notificationsApi = {
  getNotifications: () => apiRequest('/api/notifications/'),
  markAsRead: (id) => apiRequest(`/api/notifications/${id}/read/`, {
    method: 'POST',
  }),
  markAllAsRead: () => apiRequest('/api/notifications/mark-all-read/', {
    method: 'POST',
  }),
};