import { apiRequest } from "./api";

export const notificationsApi = {
  getNotifications: () => apiRequest('/api/notifications/'),
  // Try different server conventions for marking a single notification as read.
  // Some backends expose POST /api/notifications/{id}/read/, others accept
  // POST /api/notifications/mark_read/ with a JSON body { id }.
  markAsRead: async (id) => {
    // Attempt per-id endpoint first
    try {
      return await apiRequest(`/api/notifications/${id}/read/`, { method: 'POST' });
    } catch (err) {
      // ignore and try fallback
    }

    // Try mark_read bulk endpoint with single id
    try {
      return await apiRequest(`/api/notifications/mark_read/`, {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    } catch (err) {
    }

    // Final fallback: try calling mark_all_read with ids array (some APIs support this)
    try {
      return await apiRequest(`/api/notifications/mark_all_read/`, {
        method: 'POST',
        body: JSON.stringify({ ids: [id] }),
      });
    } catch (err) {
      // If everything fails, rethrow the last error to let the caller decide.
      throw err;
    }
  },
  markAllAsRead: () => apiRequest('/api/notifications/mark_all_read/', {
    method: 'POST',
  }),
};
