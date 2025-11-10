'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { notificationsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

export function NotificationsClient() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();
  const lastNotificationElementRef = useRef();
  const { currentUser, isAuthenticated } = useAuth();
  const router = useRouter();

  // Intersection Observer callback
  const lastNotificationRef = useCallback(node => {
    if (loading || loadingMore) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, { threshold: 0.5 });

    if (node) {
      observer.current.observe(node);
      lastNotificationElementRef.current = node;
    }
  }, [loading, loadingMore, hasMore]);

  // Effect for initial load
  useEffect(() => {
    // Check if we have authentication info before fetching
    if (isAuthenticated && currentUser) {
      fetchNotifications(1, false);
    } else if (!loading) {
      setError({ type: 'auth', message: 'Please log in to view notifications' });
    }
  }, [isAuthenticated, currentUser]);

  // Effect for loading more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchNotifications(page, true);
    }
  }, [page]);

  const fetchNotifications = async (pageNumber = 1, isLoadingMore = false) => {
    if (!isAuthenticated || !currentUser) {
      setError({ type: 'auth', message: 'Please log in to view notifications' });
      setLoading(false);
      return;
    }

    try {
      if (!isLoadingMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Simulate pagination by slicing the data (replace this with actual API pagination when available)
      const data = await notificationsApi.getNotifications();
      const list = data?.notifications ?? data?.results ?? (Array.isArray(data) ? data : null) ?? [];
      const normalized = list || [];
      
      const pageSize = 10;
      const start = (pageNumber - 1) * pageSize;
      const paginatedData = normalized.slice(start, start + pageSize);
      
      // Check if there's more data
      setHasMore(start + pageSize < normalized.length);

      if (isLoadingMore) {
        setNotifications(prev => [...prev, ...paginatedData]);
      } else {
        setNotifications(paginatedData);
      }

      // dispatch unread count for header
      const unread = normalized.filter(n => !n.is_read).length;
      try { window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: unread })); } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      
      // Handle authentication errors specifically
      if (err.status === 401 || err.status === 403) {
        setError({ 
          type: 'auth', 
          message: 'Your session has expired. Please log in again.' 
        });
      } else {
        setError({ 
          type: 'general', 
          message: 'Failed to load notifications' 
        });
      }
    } finally {
      if (!isLoadingMore) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    let targetUrl = '';
    
    // Determine target URL based on notification type and content
    if (notification.verse && notification.story) {
      // If both verse and story are present, go to the verse in story context
      targetUrl = `/stories/${notification.story.slug}/?verse=${notification.verse.slug}`;
    } else if (notification.verse) {
      // If only verse is present, create URL with verse parameter
      targetUrl = notification.verse.story_slug
        ? `/stories/${notification.verse.story_slug}/?verse=${notification.verse.slug}`
        : `/verses/${notification.verse.slug}`;
    } else if (notification.story) {
      // For story-related notifications
      targetUrl = `/stories/${notification.story.slug}`;
    } else if (notification.type === 'LIKE' || notification.type === 'RECOMMEND' || notification.notification_type === 'LIKE' || notification.notification_type === 'RECOMMEND') {
      // For likes and recommendations, prefer navigating to the content rather than the user
      if (notification.verse_slug) {
        targetUrl = `/stories/${notification.story_slug}/?verse=${notification.verse_slug}`;
      } else if (notification.story_slug) {
        targetUrl = `/stories/${notification.story_slug}`;
      }
    } else if (notification.sender) {
      // For user-focused notifications (follows, etc.)
      targetUrl = `/${notification.sender.username}`;
    }

    // Mark as read and update UI optimistically
    if (!notification.is_read) {
      try {
        setNotifications(prev => {
          const updated = prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n);
          const unread = updated.filter(n => !n.is_read).length;
          try { window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: unread })); } catch (e) { /* ignore */ }
          return updated;
        });
        
        // Make API call in background - no need to await
        notificationsApi.markAsRead(notification.id).catch(err => {
          console.error('Error marking notification read:', err);
        });
      } catch (err) {
        console.error('Error updating notification state:', err);
      }
    }

    // Navigate if we have a valid URL
    if (targetUrl) {
      console.debug('Navigating to:', targetUrl); // helps debug routing
      router.push(targetUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      await notificationsApi.markAllAsRead();
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, is_read: true }));
        try { window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: 0 })); } catch (e) { /* ignore */ }
        return updated;
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError({ 
        type: 'general', 
        message: 'Failed to mark all notifications as read' 
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (type) => {
    const iconClasses = "w-10 h-10 rounded-full flex items-center justify-center text-white";
    
    switch (type) {
      case 'FOLLOW':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-indigo-500 to-purple-600`}>
            <i className="fas fa-user"></i>
          </div>
        );
      case 'LIKE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-pink-500 to-red-500`}>
            <i className="fas fa-heart"></i>
          </div>
        );
      case 'COMMENT':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-blue-400 to-cyan-400`}>
            <i className="fas fa-comment"></i>
          </div>
        );
      case 'MENTION':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-green-400 to-teal-400`}>
            <i className="fas fa-at"></i>
          </div>
        );
      case 'STORY':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-pink-500 to-yellow-400`}>
            <i className="fas fa-book"></i>
          </div>
        );
      case 'VERSE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-cyan-500 to-indigo-700`}>
            <i className="fas fa-book-open"></i>
          </div>
        );
      case 'SHARE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-green-500 to-teal-500`}>
            <i className="fas fa-share-alt"></i>
          </div>
        );
      case 'WELCOME':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-orange-500 to-yellow-400`}>
            <i className="fas fa-star"></i>
          </div>
        );
      default:
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-blue-300 to-pink-200`}>
            <i className="fas fa-bell"></i>
          </div>
        );
    }
  };

  const NotificationSkeleton = () => (
    <div className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 w-10 h-10 rounded-full bg-slate-800 animate-pulse"></div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="h-5 bg-slate-800 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-slate-800 rounded w-16 animate-pulse"></div>
          </div>
          <div className="h-4 bg-slate-800 rounded w-full mt-2 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6 mt-1 animate-pulse"></div>
          <div className="flex items-center mt-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse mr-3"></div>
            <div className="h-3 bg-slate-800 rounded w-24 animate-pulse"></div>
          </div>
        </div>
        <div className="ml-4 mt-1">
          <div className="w-3 h-3 rounded-full bg-slate-800 animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  // Show authentication error if not logged in
  if (error && error.type === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 flex flex-col items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-5xl text-cyan-500/50 mb-6">
            <i className="fas fa-lock"></i>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <Link href="/login" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl font-medium hover:opacity-90 transition-opacity">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 py-4 px-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white hover:bg-slate-800/50 p-2 rounded-lg transition-colors">
          <i className="fas fa-arrow-left"></i>
          <span></span>
        </Link>
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Notifications</h1>
        {notifications.length > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            disabled={markingAllRead}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium flex items-center gap-1.5 disabled:opacity-50 transition-all hover:opacity-90"
          >
            {markingAllRead ? (
              <>
                <i className="fas fa-spinner fa-spin text-sm"></i>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check text-sm"></i>
                <span>Mark all as read</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : error && error.type === 'general' ? (
          <div className="text-center py-20">
            <div className="text-5xl text-red-500/50 mb-4">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-400 mb-6">{error.message}</p>
            <button 
              onClick={fetchNotifications}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl font-medium hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl text-cyan-500/50 mb-4">
              <i className="fas fa-bell"></i>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No notifications</h2>
            <p className="text-gray-400">You are all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pb-10 custom-scrollbar">
            {notifications.map((notification, index) => (
              <div 
                key={notification.id}
                ref={index === notifications.length - 1 ? lastNotificationRef : null}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 flex items-start gap-3 ${
                  !notification.is_read ? 'bg-slate-900/60 border-l-4 border-cyan-500' : 'bg-slate-900/60 backdrop-blur-sm'
                }`}
              >
                {/* Notification Icon */}
                {getNotificationIcon(notification.notification_type ?? notification.type)}
                
                {/* Notification Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">
                      {notification.message || notification.title}
                    </h3>
                    <span className="text-sm text-gray-400 ml-2 whitespace-nowrap">
                      {notification.time_ago}
                    </span>
                  </div>
                  
                  {/* Sender Info */}
                  {notification.sender && (
                    <div className="flex items-center mt-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white font-bold mr-3">
                        {notification.sender.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-400">From: {notification.sender.username}</span>
                    </div>
                  )}
                  
                  {/* Content Preview */}
                  {(notification.story || notification.verse) && (
                    <div className="flex gap-3 mt-3 md:flex-row flex-col">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        {notification.story?.cover_image ? (
                          <Image 
                            src={notification.story.cover_image.file_url} 
                            alt={notification.story.title} 
                            width={64} 
                            height={64} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white">
                            <i className="fas fa-book"></i>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">
                          {notification.verse ? notification.verse.title : notification.story.title}
                        </h4>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {notification.verse 
                            ? (notification.verse.description || "A verse in this story")
                            : (notification.story?.description || notification.story?.summary || `A story by ${notification.story?.creator?.username || "Unknown"}`)
                          }
                        </p>
                        {notification.verse && (
                          <p className="text-xs text-gray-500 mt-1">From story: {notification.verse.story_title}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Unread Indicator */}
                {!notification.is_read && (
                  <div className="ml-2 mt-1">
                    <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  </div>
                )}
              </div>
            ))}
            {loadingMore && (
              <div className="space-y-3 mt-4">
                {[...Array(3)].map((_, i) => (
                  <NotificationSkeleton key={`loading-more-${i}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(6, 10, 25, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.5);
        }
      `}</style>
    </div>
  );
}