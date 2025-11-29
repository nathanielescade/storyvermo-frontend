// components/header/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '../../../../lib/api';
import {
  isLeaderboardNotification,
  isAchievementNotification,
  isInactivityNotification,
  formatNotificationDisplay,
  getNotificationRoute,
  getNotificationTypeConfig
} from '../../../../lib/leaderboardNotifications';
import LeaderboardNotificationDisplay from '../LeaderboardNotificationDisplay';

const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsPreview, setNotificationsPreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const notificationRef = useRef(null);

  // Fetch unread count on mount and subscribe to updates
  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    const fetchUnreadCount = async () => {
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
        if (!count) {
          try {
            const full = await notificationsApi.getNotifications();
            const list = full?.notifications ?? full?.results ?? (Array.isArray(full) ? full : []);
            count = list.filter(n => !n.is_read).length;
          } catch (e) {
          }
        }
        if (mounted) setUnreadCount(count);
      } catch (err) {
      }
    };
    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 30000);
    const handleCountUpdate = (event) => {
      const newCount = typeof event.detail === 'number' ? event.detail : 0;
      setUnreadCount(newCount);
    };
    window.addEventListener('notifications:count:update', handleCountUpdate);
    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('notifications:count:update', handleCountUpdate);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showNotifications) return;
    let mounted = true;
    setPreviewLoading(true);
    (async () => {
      if (!isAuthenticated) {
        setNotificationsPreview([]);
        setPreviewLoading(false);
        return;
      }
      try {
        const data = await notificationsApi.getNotifications();
        const list = data?.notifications ?? data?.results ?? (Array.isArray(data) ? data : []);
        if (mounted) {
          setNotificationsPreview(list);
          setPreviewLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setPreviewLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [showNotifications, isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotificationsPreview(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x));
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: newCount }));
    } catch (err) {
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotificationsPreview([]);
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: 0 }));
    } catch (err) {
    }
  };

  return (
    <div className="notification-bell-wrapper relative" style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ position: 'relative' }}>
        <button 
          className="notification-button w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105" 
          aria-label="Notifications" 
          type="button" 
          style={{ position: 'relative', zIndex: '1500', overflow: 'visible' }}
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <i className="fas fa-bell text-white text-xl"></i>
        </button>

        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg" style={{ transform: 'translate(30%, -30%)', zIndex: 1501, border: '1px solid rgba(255,255,255,0.3)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        <div 
          ref={notificationRef}
          className="notification-dropdown dropdown-menu" 
          style={{ 
            minWidth: '320px', 
            maxWidth: '420px', 
            position: 'fixed', 
            zIndex: '9999',
            display: showNotifications ? 'flex' : 'none',
            flexDirection: 'column',
            maxHeight: '80vh'
          }}
        >
          <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', flex: 'none' }}>
            <div className="notification-title">Notifications</div>
            <div className="notification-clear" style={{ cursor: 'pointer', color: '#9bdff8', fontSize: '0.9rem', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.25)' }} onClick={markAllAsRead}>
              Clear all
            </div>
          </div>
          <div className="notification-list" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '8px', minHeight: '100px', maxHeight: '360px' }}>
            {previewLoading ? (
              <div className="text-center py-4 text-gray-400">Loading...</div>
            ) : notificationsPreview.length === 0 ? (
              <div className="text-center py-4 text-gray-400">No notifications yet</div>
            ) : (
              notificationsPreview.slice(0,5).map(n => {
                // Check if this is a leaderboard or achievement notification
                if (isLeaderboardNotification(n) || isAchievementNotification(n)) {
                  return (
                    <div key={n.id} onClick={(e) => e.stopPropagation()}>
                      <LeaderboardNotificationDisplay
                        notification={n}
                        onMarkAsRead={markAsRead}
                        onNavigate={(path) => {
                          setShowNotifications(false);
                          router.push(path);
                        }}
                      />
                    </div>
                  );
                }

                // Handle inactivity notifications specially
                if (isInactivityNotification(n)) {
                  return (
                    <div
                      key={n.id}
                      className="px-2 py-2 rounded cursor-pointer transition-all mb-1 hover:bg-slate-700/40 bg-slate-800/30 border border-slate-700/40"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!n.is_read) await markAsRead(n.id);
                        setShowNotifications(false);
                        router.push('/');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Icon */}
                        <span className="text-base shrink-0">{getNotificationTypeConfig(n.notification_type).icon}</span>

                        {/* Title - single line */}
                        <span className="text-sm font-medium text-white truncate flex-1">{n.title}</span>

                        {/* Unread Indicator */}
                        {!n.is_read && (
                          <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        )}
                      </div>
                    </div>
                  );
                }

                // Format and display all other notification types
                const displayData = formatNotificationDisplay(n);
                if (!displayData) return null;

                return (
                  <div
                    key={n.id}
                    className="px-2 py-2 rounded cursor-pointer transition-all mb-1 hover:bg-slate-700/40 bg-slate-800/30 border border-slate-700/40"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!n.is_read) await markAsRead(n.id);
                      
                      // Navigate to appropriate location
                      const route = getNotificationRoute(n);
                      setShowNotifications(false);
                      router.push(route);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {/* Icon */}
                      <span className="text-base shrink-0">{displayData.icon}</span>

                      {/* Title - single line */}
                      <span className="text-sm font-medium text-white truncate flex-1">{displayData.title}</span>

                      {/* Unread Indicator */}
                      {!n.is_read && (
                        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="notification-footer" style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', flex: 'none' }}>
            <Link href="/notifications" onClick={() => setShowNotifications(false)} className="notification-view-all" style={{ cursor: 'pointer', color: '#fff', textAlign: 'center', padding: '12px', display: 'block', margin: '0', borderRadius: '8px', background: 'linear-gradient(90deg, rgba(0,212,255,0.3) 0%, rgba(155,223,248,0.3) 100%)', transition: 'all 0.2s ease', fontWeight: '600', textShadow: '0 0 10px rgba(155,223,248,0.5)', border: '1px solid rgba(155,223,248,0.4)', boxShadow: '0 0 15px rgba(155,223,248,0.15)' }}>
              <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>View all notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;