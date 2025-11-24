// components/header/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '../../../../lib/api';

const NotificationBell = () => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsPreview, setNotificationsPreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const notificationRef = useRef(null);

  // Fetch unread count on mount and subscribe to updates
  useEffect(() => {
    let mounted = true;
    
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
            console.debug('notifications: fallback to full list failed', e);
          }
        }

        if (mounted) setUnreadCount(count);
      } catch (err) {
        console.debug('Failed to fetch notification count', err);
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
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    let mounted = true;
    setPreviewLoading(true);
    (async () => {
      try {
        const data = await notificationsApi.getNotifications();
        const list = data?.notifications ?? data?.results ?? (Array.isArray(data) ? data : []);
        if (mounted) {
          setNotificationsPreview(list);
          setPreviewLoading(false);
        }
      } catch (err) {
        console.debug('Failed to fetch preview notifications', err);
        if (mounted) setPreviewLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [showNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotificationsPreview(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x));
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: newCount }));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotificationsPreview([]);
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: 0 }));
    } catch (err) {
      console.error('Failed to mark all read from header', err);
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
              notificationsPreview.slice(0,5).map(n => (
                <div key={n.id} className={`p-2 rounded-md ${!n.is_read ? 'bg-black/20' : ''}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={async (e) => {
                  e.stopPropagation();
                  if (!n.is_read) await markAsRead(n.id);
                  
                  // Navigate based on notification type and content
                  if (n.verse && n.story) {
                    router.push(`/stories/${n.story.slug}/?verse=${n.verse.slug}`);
                  } else if (n.verse) {
                    router.push(`/stories/${n.verse.story_slug}/?verse=${n.verse.slug}`);
                  } else if (n.story) {
                    router.push(`/stories/${n.story.slug}`);
                  } else if (n.type === 'LIKE' || n.type === 'RECOMMEND' || n.notification_type === 'LIKE' || n.notification_type === 'RECOMMEND') {
                    if (n.verse_slug) {
                      router.push(`/stories/${n.story_slug}/?verse=${n.verse_slug}`);
                    } else if (n.story_slug) {
                      router.push(`/stories/${n.story_slug}`);
                    } else {
                      router.push('/notifications');
                    }
                  } else if (n.sender) {
                    router.push(`/${n.sender.username}`);
                  } else {
                    router.push('/notifications');
                  }
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(90deg,#ff6b35,#8a4fff)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                    {n.sender?.username ? n.sender.username.charAt(0).toUpperCase() : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e6f7ff', fontSize: '0.95rem' }}>{n.message || n.title}</div>
                    <div style={{ color: '#9bdff8', fontSize: '0.8rem', marginTop: 6 }}>{n.time_ago}</div>
                  </div>
                </div>
              ))
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