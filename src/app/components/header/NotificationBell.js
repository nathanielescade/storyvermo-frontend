// components/header/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '../../../../lib/api';

const NotificationBell = ({ isOpen = false, onOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsPreview, setNotificationsPreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const notificationRef = useRef(null);

  // Fetch unread count on mount and whenever authenticated status changes
  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      // If not authenticated, show a single default guest notification
      // so users know they can sign in to get personalized notifications.
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

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setPreviewLoading(true);
    (async () => {
      if (!isAuthenticated) {
        // Provide two friendly default notifications for unauthenticated visitors
        // to encourage sign-in and content creation.
        const guestNotifications = [
          {
            id: 'guest-1',
            message: 'Welcome to StoryVermo — sign up or log in to get personalized updates and join the conversation!',
            title: 'Welcome',
            is_read: false,
            notification_type: 'WELCOME'
          },
          {
            id: 'guest-2',
            message: 'Join the community — create lasting stories, collaborate with others, and build memorable experiences together.',
            title: 'About StoryVermo',
            is_read: false,
            notification_type: 'SYSTEM'
          }
        ];
        setNotificationsPreview(guestNotifications);
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
  }, [isOpen, isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      // If this is the guest-default notification, don't call the API —
      // simply clear the local preview and badge and prompt login if needed.
      if (id === 'guest-default') {
        setNotificationsPreview([]);
        const newCount = 0;
        setUnreadCount(newCount);
        window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: newCount }));
        return;
      }

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
      // If unauthenticated, clear local guest preview only
      if (!isAuthenticated) {
        setNotificationsPreview([]);
        setUnreadCount(0);
        window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: 0 }));
        return;
      }

      await notificationsApi.markAllAsRead();
      setNotificationsPreview([]);
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: 0 }));
    } catch (err) {
    }
  };

  const getNotificationIcon = (notification) => {
    const notificationType = notification?.notification_type || notification?.type || 'SYSTEM';
    
    switch (notificationType) {
      case 'FOLLOW':
        return '👤';
      case 'LIKE':
        return '❤️';
      case 'COMMENT':
        return '💬';
      case 'MENTION':
        return '@';
      case 'STORY':
        return '📖';
      case 'VERSE':
        return '✨';
      case 'SHARE':
        return '🔗';
      case 'SAVE':
        return '💾';
      case 'WELCOME':
        return '🎉';
      case 'SYSTEM':
        return '⭐';
      default:
        return '📬';
    }
  };

  const getNotificationRoute = (notification) => {
    if (notification.story) {
      const slug = notification.story.slug || notification.story?.slugified || notification.story.id;
      return `/stories/${slug}`;
    } else if (notification.verse) {
      const verseId = notification.verse.id || notification.verse?.pk || notification.verse?.verse_id || notification.verse?.public_id;
      const storySlug = notification.verse.story_slug || notification.verse?.story?.slug || notification.story?.slug;
      if (storySlug && verseId) return `/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(verseId)}`;
      if (verseId) return `/verses/${encodeURIComponent(verseId)}`;
      const slug = notification.verse.slug || notification.verse?.slugified || notification.verse?.id || '';
      return `/verses/${encodeURIComponent(slug)}`;
    } else if (notification.sender) {
      const username = notification.sender.username || notification.sender.slug || notification.sender.id;
      // Profiles are at the root `/${username}` route
      return `/${username}`;
    }
    return '/notifications';
  };

  return (
    <div className="notification-bell-wrapper relative" style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ position: 'relative' }}>
        <button 
          className="notification-button w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105" 
          aria-label="Notifications" 
          type="button" 
          style={{ position: 'relative', zIndex: '1500', overflow: 'visible' }}
          onClick={() => {
            if (isOpen) {
              onClose?.();
            } else {
              onOpen?.();
            }
          }}
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
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            maxHeight: '80vh'
          }}
        >
          <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', flex: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="notification-title">Notifications</div>
              {/* Header login button removed per UX request */}
            </div>
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
                const isGuest = !isAuthenticated;
                return (
                  <div
                    key={n.id}
                    className="px-2 py-2 rounded transition-all mb-2 hover:bg-slate-700/40 bg-slate-800/30 border border-slate-700/40 cursor-pointer"
                    onClick={async (e) => {
                      // Authenticated users: clicking the notification navigates to the target
                      if (isGuest) return;
                      e.stopPropagation();
                      try {
                        if (!n.is_read) await markAsRead(n.id);
                        const route = getNotificationRoute(n);
                        onClose?.();
                        router.push(route);
                      } catch (err) {
                        // swallow navigation/mark errors
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {/* Icon */}
                      <span className="text-base shrink-0">{getNotificationIcon(n)}</span>

                      {/* Title (single-line for authenticated users) + optional message for guests */}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white truncate">{n.title || n.notification_type}</div>
                        {isGuest && (
                          <div className="text-xs text-gray-300 whitespace-normal break-words">{n.message}</div>
                        )}
                      </div>

                      {/* Unread Indicator */}
                      {!n.is_read && (
                        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      )}

                      {/* Guest-only CTA for the first guest message */}
                      {isGuest && n.id === 'guest-1' && (
                        <div className="ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'signup' } }));
                              } catch (err) {
                                router.push('/signup');
                              }
                              // clear the preview locally for this guest notification
                              setNotificationsPreview(prev => prev.filter(x => x.id !== n.id));
                              setUnreadCount(Math.max(0, unreadCount - 1));
                            }}
                            className="px-3 py-1 rounded bg-cyan-500 text-black font-semibold text-sm"
                          >
                            Join us
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="notification-footer" style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.16)', flex: 'none' }}>
            <button
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'login' } }));
                } catch (e) {
                  router.push('/login');
                }
                onClose?.();
              }}
              className="notification-view-all"
              style={{ width: '100%', cursor: 'pointer', color: '#fff', textAlign: 'center', padding: '8px 10px', display: 'block', margin: '0', borderRadius: '6px', background: 'linear-gradient(90deg, rgba(0,212,255,0.18) 0%, rgba(155,223,248,0.18) 100%)', transition: 'all 0.12s ease', fontWeight: '600', fontSize: '0.95rem', border: '1px solid rgba(155,223,248,0.28)' }}
            >
              <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>View all notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;  