// components/header/NotificationBell.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '../../../../lib/api';

const NotificationBell = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count on mount and whenever authenticated status changes
  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      // If not authenticated, show a single default guest notification
      if (!isAuthenticated) {
        if (mounted) setUnreadCount(1);
        return;
      }

      try {
        let data = null;
        try {
          data = await notificationsApi.getUnreadCount();
        } catch (e) {
          data = null;
        }

        let count = 0;
        if (typeof data === 'number') {
          count = data;
        } else if (data && typeof data === 'object') {
          if (typeof data.unread_count === 'number') count = data.unread_count;
          else if (typeof data.count === 'number') count = data.count;
          else if (Array.isArray(data)) count = data.filter(n => !n.is_read).length;
          else if (data.notifications) count = (data.notifications.filter ? data.notifications.filter(n => !n.is_read).length : 0);
          else if (data.results) count = (data.results.filter ? data.results.filter(n => !n.is_read).length : 0);
        }

        // If no count found, try fetching full notifications list
        if (!count) {
          try {
            const full = await notificationsApi.getNotifications();
            const list = full?.notifications ?? full?.results ?? (Array.isArray(full) ? full : []);
            count = list.filter(n => !n.is_read).length;
          } catch (e) {
            // ignore errors fetching unread count
          }
        }

        if (mounted) setUnreadCount(count);
      } catch (err) {
        if (mounted) setUnreadCount(0);
      }
    };

    // Fetch immediately when authenticated
    fetchUnreadCount();

    // Also set up polling every 30 seconds
    const intervalId = setInterval(fetchUnreadCount, 30000);

    // Listen for custom event updates (real-time from other components)
    const handleCountUpdate = (event) => {
      const newCount = typeof event.detail === 'number' ? event.detail : 0;
      if (mounted) setUnreadCount(newCount);
    };
    window.addEventListener('notifications:count:update', handleCountUpdate);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('notifications:count:update', handleCountUpdate);
    };
  }, [isAuthenticated]);

  const handleNotificationClick = () => {
    if (!isAuthenticated) {
      // Open auth modal for unauthenticated users
      if (typeof openAuthModal === 'function') {
        openAuthModal('login');
      }
      return;
    }

    // Authenticated users go directly to notifications page
    router.push('/notifications');
  };

  return (
    <div className="notification-bell-wrapper relative inline-block">
      <button 
        className="notification-button w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105" 
        aria-label="Notifications" 
        type="button" 
        onClick={handleNotificationClick}
      >
        <i className="fas fa-bell text-white text-xl"></i>
      </button>

      {unreadCount > 0 && (
        <span 
          className="absolute top-0 right-0 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg" 
          style={{ 
            transform: 'translate(30%, -30%)', 
            zIndex: 1501, 
            border: '1px solid rgba(255,255,255,0.3)' 
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;  