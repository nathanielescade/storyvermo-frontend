import { useState, useEffect } from 'react';

/**
 * Hook for fetching and managing guest notifications
 * Handles guest-only notification display based on visit count
 */
export function useGuestNotifications() {
  const [notification, setNotification] = useState(null);
  const [visitCount, setVisitCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  // Fetch guest notifications on mount only
  useEffect(() => {
    const fetchGuestNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get dismissed notifications from sessionStorage
        let dismissed = new Set();
        try {
          const stored = sessionStorage.getItem('dismissedGuestNotifications');
          if (stored) {
            dismissed = new Set(JSON.parse(stored));
          }
        } catch (e) {
          console.debug('[Guest Notifications] Failed to load dismissed:', e);
        }
        setDismissedNotifications(dismissed);

        const response = await fetch('/api/notifications/guest_notifications/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          console.error(`[Guest Notifications] API Error: ${response.status}`, {
            url: '/api/notifications/guest_notifications/',
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.debug('[Guest Notifications] Data received:', data);

        setVisitCount(data.visit_count || 0);
        setIsAuthenticated(data.is_authenticated || false);

        // Only show notification if not authenticated and available
        if (!data.is_authenticated && data.guest_notifications?.length > 0) {
          // Filter out already dismissed notifications
          const availableNotifications = data.guest_notifications.filter(
            (n) => !dismissed.has(n.id)
          );

          if (availableNotifications.length > 0) {
            // Prioritize high-priority notifications (priority 1)
            const sortedNotifications = availableNotifications.sort(
              (a, b) => (a.priority || 999) - (b.priority || 999)
            );
            console.debug('[Guest Notifications] Setting notification:', sortedNotifications[0]);
            setNotification(sortedNotifications[0]);
          } else {
            console.debug('[Guest Notifications] All notifications dismissed');
            setNotification(null);
          }
        } else {
          console.debug('[Guest Notifications] User authenticated or no notifications available');
          setNotification(null);
        }
      } catch (err) {
        console.error('[Guest Notifications] Failed to fetch:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuestNotifications();
  }, []);

  const dismissNotification = (notificationId) => {
    console.debug('[Guest Notifications] Dismissing notification:', notificationId);
    setDismissedNotifications((prev) => new Set([...prev, notificationId]));
    setNotification(null);

    try {
      const dismissed = JSON.parse(
        sessionStorage.getItem('dismissedGuestNotifications') || '[]'
      );
      if (!dismissed.includes(notificationId)) {
        dismissed.push(notificationId);
        sessionStorage.setItem('dismissedGuestNotifications', JSON.stringify(dismissed));
      }
    } catch (e) {
      console.debug('[Guest Notifications] SessionStorage error:', e);
    }
  };

  const trackNotificationShown = (notification) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'guest_notification_shown', {
        notification_type: notification.type,
        visit_count: visitCount,
      });
    }
  };

  const trackCTAClicked = (notification) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'guest_notification_cta_clicked', {
        notification_type: notification.type,
        cta_url: notification.cta_url,
      });
    }
  };

  return {
    notification,
    visitCount,
    isAuthenticated,
    isLoading,
    error,
    dismissNotification,
    trackNotificationShown,
    trackCTAClicked,
  };
}

export default useGuestNotifications;
