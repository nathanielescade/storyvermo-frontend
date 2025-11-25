/**
 * Guest Notification Utilities
 * Helper functions for managing guest notifications
 */

/**
 * Get dismissed notifications from sessionStorage
 * @returns {Array<string>} Array of dismissed notification IDs
 */
export const getDismissedNotifications = () => {
  try {
    const dismissed = sessionStorage.getItem('dismissedGuestNotifications');
    return dismissed ? JSON.parse(dismissed) : [];
  } catch (e) {
    console.debug('[Guest Notifications] Failed to retrieve dismissed notifications:', e);
    return [];
  }
};

/**
 * Clear dismissed notifications from sessionStorage
 */
export const clearDismissedNotifications = () => {
  try {
    sessionStorage.removeItem('dismissedGuestNotifications');
  } catch (e) {
    console.debug('[Guest Notifications] Failed to clear dismissed notifications:', e);
  }
};

/**
 * Check if a notification has been dismissed in current session
 * @param {string} notificationId - The ID of the notification to check
 * @returns {boolean} True if notification has been dismissed
 */
export const isNotificationDismissed = (notificationId) => {
  const dismissed = getDismissedNotifications();
  return dismissed.includes(notificationId);
};

/**
 * Get visit count from localStorage (persists across sessions)
 * @returns {number} The current visit count
 */
export const getVisitCount = () => {
  try {
    const count = localStorage.getItem('guestVisitCount');
    return count ? parseInt(count, 10) : 0;
  } catch (e) {
    console.debug('[Guest Notifications] Failed to get visit count:', e);
    return 0;
  }
};

/**
 * Increment and return visit count
 * @returns {number} The incremented visit count
 */
export const incrementVisitCount = () => {
  try {
    const current = getVisitCount();
    const next = current + 1;
    localStorage.setItem('guestVisitCount', next.toString());
    return next;
  } catch (e) {
    console.debug('[Guest Notifications] Failed to increment visit count:', e);
    return 0;
  }
};

/**
 * Get notification recommendation based on visit count
 * Matches backend logic for when to show certain notifications
 * @param {number} visitCount - Current visit count
 * @returns {Array<number>} Recommended notification visit counts
 */
export const getRecommendedNotificationVisits = () => {
  // Match backend thresholds from send_guest_notifications_task
  return [1, 3, 5, 10, 15]; // Visit numbers that typically get notifications
};

/**
 * Should show notification based on visit count and notification data
 * @param {number} visitCount - Current visit count
 * @param {Object} notification - The notification object
 * @returns {boolean} True if notification should be shown
 */
export const shouldShowNotification = (visitCount, notification) => {
  if (!notification) return false;
  
  // Always show if visit count isn't specified
  if (!notification.visit_count) return true;
  
  // Show if visit count matches
  return visitCount === notification.visit_count;
};

/**
 * Format notification for display
 * Ensures all required fields are present with fallbacks
 * @param {Object} notification - Raw notification from API
 * @returns {Object} Formatted notification object
 */
export const formatNotification = (notification) => {
  if (!notification) return null;

  return {
    id: notification.id || '',
    type: notification.type || 'GUEST_MESSAGE',
    title: notification.title || 'Welcome to StoryVermo!',
    message: notification.message || 'Start sharing your stories today.',
    cta: notification.cta || 'Get Started',
    cta_url: notification.cta_url || '/',
    emoji: notification.emoji || '🎉',
    priority: notification.priority || 2,
    dismiss_count: notification.dismiss_count ?? 1,
    visit_count: notification.visit_count || undefined,
  };
};

/**
 * Validate notification structure
 * @param {Object} notification - Notification object to validate
 * @returns {boolean} True if notification has required fields
 */
export const isValidNotification = (notification) => {
  if (!notification) return false;

  return !!(
    notification.id &&
    notification.type &&
    notification.title &&
    notification.message &&
    notification.emoji &&
    typeof notification.priority === 'number'
  );
};

/**
 * Track guest analytics event
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Additional event data
 */
export const trackGuestAnalytic = (eventName, eventData = {}) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        guest_event: true,
        ...eventData,
      });
    }
  } catch (e) {
    console.debug('[Guest Notifications] Analytics tracking failed:', e);
  }
};
