'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notificationsApi, absoluteUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

// SmartImg component for optimized images
function SmartImg({ src, alt = '', width, height, fill, className, style }) {
  if (!src) return null;
  const isObjectUrl = typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));

  if (isObjectUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...(style || {}), width: fill ? '100%' : 'auto', height: fill ? '100%' : 'auto', objectFit: 'cover' }}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();
  const { currentUser, isAuthenticated } = useAuth();
  const router = useRouter();

  // Helper function to get display name based on account type
  const getDisplayName = (user) => {
    if (!user) return 'Unknown';
    if (user.account_type === 'brand' && user.brand_name) {
      return user.brand_name;
    }
    return user.username || 'Unknown';
  };

  // Helper function to get image URL from different possible structures
  const getImageUrl = (imageObj) => {
    if (!imageObj) return null;
    
    // Handle different possible structures of image object
    let imageUrl;
    if (typeof imageObj === 'string') {
      imageUrl = imageObj;
    } else {
      imageUrl = imageObj.file_url || imageObj.url;
    }
    
    // Check if imageUrl is a string and not empty
    if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      return imageUrl;
    }
    
    return null;
  };

  const fetchNotifications = useCallback(async (pageNumber = 1, isLoadingMore = false) => {
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
      let normalized = list || [];
      
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
  }, [isAuthenticated, currentUser]);

  // Effect for initial load
  useEffect(() => {
    // Check if we have authentication info before fetching
    if (isAuthenticated && currentUser) {
      fetchNotifications(1, false);
    } else if (!loading) {
      setError({ type: 'auth', message: 'Please log in to view notifications' });
    }
    // Only depend on authentication state, not the callback itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser]);

  // Effect for loading more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchNotifications(page, true);
    }
    // Only depend on page changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleNotificationClick = async (notification) => {
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
        });
      } catch (err) {
      }
    }

    // Navigate to related content if available - prefer story+verse context when possible
    const verse = notification.verse;
    const story = notification.story;

    const verseId = verse?.id || verse?.pk || verse?.verse_id || verse?.public_id || verse?.publicId || verse?.public_id;
    const storySlug = (story && (story.slug || story.slugified || story.story_slug))
      || (verse && (verse.story_slug || (verse.story && (verse.story.slug || verse.story.story_slug))));

    if (storySlug && verseId) {
      // Open story page and jump to the verse via query param (matches Verses page links)
      router.push(`/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(verseId)}`);
      return;
    }

    if (story) {
      const slug = story.slug || story.slugified || story.id;
      router.push(`/stories/${encodeURIComponent(slug)}`);
      return;
    }

    if (verseId) {
      router.push(`/verses/${encodeURIComponent(verseId)}`);
      return;
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
      setError({ 
        type: 'general', 
        message: 'Failed to mark all notifications as read' 
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (notification) => {
    const notificationType = notification?.notification_type || notification?.type || 'SYSTEM';
    const iconClasses = "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white";

    // Type-based icons
    switch (notificationType) {
      case 'FOLLOW':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-orange-400 to-yellow-500`}>
            👤
          </div>
        );
      case 'LIKE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-red-400 to-pink-500`}>
            ❤️
          </div>
        );
      case 'COMMENT':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-blue-400 to-cyan-500`}>
            💬
          </div>
        );
      case 'MENTION':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-pink-400 to-rose-500`}>
            @
          </div>
        );
      case 'STORY':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-emerald-400 to-teal-500`}>
            📖
          </div>
        );
      case 'VERSE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-indigo-400 to-purple-500`}>
            ✨
          </div>
        );
      case 'SHARE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-green-500 to-teal-500`}>
            🔗
          </div>
        );
      case 'SAVE':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-green-400 to-emerald-500`}>
            💾
          </div>
        );
      case 'WELCOME':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-cyan-400 to-blue-500`}>
            🎉
          </div>
        );
      case 'SYSTEM':
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-purple-400 to-pink-500`}>
            ⭐
          </div>
        );
      default:
        return (
          <div className={`${iconClasses} bg-gradient-to-r from-blue-300 to-pink-200`}>
            📬
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
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-2xl cursor-pointer transition-all hover:bg-slate-800/50 flex flex-col gap-3 ${
                  !notification.is_read ? 'bg-slate-900/60 border-l-4 border-cyan-500' : 'bg-slate-900/60 backdrop-blur-sm'
                }`}
              >
                {/* Time - Top Right */}
                <div className="flex justify-end">
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {notification.time_ago}
                  </span>
                </div>
                
                {/* Main Content Row */}
                <div className="flex items-start gap-3">
                  {/* Notification Icon */}
                  {getNotificationIcon(notification)}
                  
                  {/* Notification Content - Full Width */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white break-words">
                      {notification.message || notification.title}
                    </h3>
                    
                    {/* Sender Info */}
                    {notification.sender && (
                      <div className="flex items-center mt-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white font-bold mr-3 shrink-0">
                          {getDisplayName(notification.sender).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-400 break-words">From: {getDisplayName(notification.sender)}</span>
                      </div>
                    )}
                    
                    {/* Content Preview */}
                    {(notification.story || notification.verse) && (
                      <div className="flex gap-3 mt-3 md:flex-row flex-col">
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative">
                          {notification.story?.cover_image ? (
                            <SmartImg 
                              src={getImageUrl(notification.story.cover_image)} 
                              alt={notification.story.title} 
                              className="w-full h-full object-cover"
                              fill
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white">
                              📖
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white break-words">
                            {notification.verse ? notification.verse.title : notification.story.title}
                          </h4>
                          <p className="text-sm text-gray-400 line-clamp-2 break-words">
                            {notification.verse 
                              ? (notification.verse.description || "A verse in this story")
                              : (notification.story?.description || notification.story?.summary || `A story by ${getDisplayName(notification.story?.creator) || "Unknown"}`)
                            }
                          </p>
                          {notification.verse && (
                            <p className="text-xs text-gray-500 mt-1">From story: {notification.verse.story_title}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!notification.is_read && (
                    <div className="shrink-0">
                      <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loadingMore && (
              <div className="space-y-3 mt-4">
                {[...Array(3)].map((_, i) => (
                  <NotificationSkeleton key={`loading-more-${i}`} />
                ))}
              </div>
            )}
            {/* Manual load more control (infinite scroll removed) */}
            {hasMore && !loadingMore && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:opacity-90"
                >
                  Load more
                </button>
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