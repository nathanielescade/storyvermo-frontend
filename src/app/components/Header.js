'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { notificationsApi } from '../../../lib/api';

const Header = ({ openAuthModal }) => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsPreview, setNotificationsPreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [hasMounted, setHasMounted] = useState(false); // Track if component has mounted
  
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const router = useRouter();

  // Set hasMounted to true when component mounts
  useEffect(() => {
    setHasMounted(true);
    
    // Load recent searches from localStorage only on client side
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
    
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch unread count on mount and subscribe to updates
  useEffect(() => {
    let mounted = true;
    async function fetchCount() {
      try {
        // Prefer dedicated unread-count endpoint when available
        let data = null;
        try {
          data = await notificationsApi.getUnreadCount();
        } catch (e) {
          // ignore and fallback to full list
          data = null;
        }

        // Normalize different possible shapes for unread count
        let count = 0;
        if (typeof data === 'number') {
          count = data;
        } else if (data && typeof data === 'object') {
          // Common shapes: { unread_count: X }, { count: X }, { results: [...] }
          if (typeof data.unread_count === 'number') count = data.unread_count;
          else if (typeof data.count === 'number') count = data.count;
          else if (Array.isArray(data)) count = data.filter(n => !n.is_read).length;
          else if (data.notifications) count = (data.notifications.filter ? data.notifications.filter(n => !n.is_read).length : 0);
          else if (data.results) count = (data.results.filter ? data.results.filter(n => !n.is_read).length : 0);
        }

        // If unread count still zero (or we couldn't get a numeric value), try fetching full notifications list
        if (!count) {
          try {
            const full = await notificationsApi.getNotifications();
            const list = full?.notifications ?? full?.results ?? (Array.isArray(full) ? full : []);
            count = list.filter(n => !n.is_read).length;
          } catch (e) {
            // ignore - we'll keep count as 0
            console.debug('notifications: fallback to full list failed', e);
          }
        }

        if (mounted) setUnreadCount(count);
      } catch (err) {
        console.debug('Failed to fetch notification count', err);
      }
    }
    fetchCount();

    const handler = (e) => {
      const newCount = typeof e.detail === 'number' ? e.detail : 0;
      setUnreadCount(newCount);
    };
    window.addEventListener('notifications:count:update', handler);
    return () => {
      mounted = false;
      window.removeEventListener('notifications:count:update', handler);
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

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Add to recent searches
      const newSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newSearches));
      
      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Helper function to safely get user initial
  const getUserInitial = (username) => {
    if (!username || typeof username !== 'string') return '';
    return username.charAt(0).toUpperCase();
  };

  // Helper function to safely get username
  const getUsername = (user) => {
    if (!user) return '';
    return user.username || '';
  };

  // Helper function to safely get user email
  const getUserEmail = (user) => {
    if (!user) return '';
    return user.email || '';
  };

  // Helper function to safely get profile image URL
  const getProfileImageUrl = (user) => {
    if (!user) return '';
    return user.profile_image_url || '';
  };

  return (
    <div className="fixed-header">
      {/* Logo image - link to home */}
      <Link 
        href="/"
        className="hover:opacity-80 transition-opacity"
      >
        <Image 
          src="/storyvermo_logo.png" 
          alt="StoryVermo"
          width={56}
          height={48}
          className="h-12 w-14"
        />
      </Link>
      
      <div className="flex gap-4 items-center ml-auto relative" id="searchContainer">
        {/* Search bar for desktop - only visible when not mobile */}
        <form className="search-bar-desktop hidden md:block" id="desktopSearchForm" onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              id="desktopSearchInput"
              name="q"
              placeholder="Search verses, tags, creators..."
              className="search-input w-64 py-2.5 pl-10 pr-4 rounded-full bg-black/30 backdrop-blur-md border border-neon-blue/50 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neon-blue"></i>
            
            {/* Search Dropdown */}
            <div 
              id="searchDropdown"
              className="search-dropdown hidden"
            >
              {/* Recent Searches */}
              <div className="search-section" id="recentSearchesContainer">
                <div className="search-section-title">
                  <h3 className="flex items-center gap-1">
                    <i className="fas fa-history"></i> Recent Searches
                  </h3>
                  <button 
                    id="clearRecentSearches"
                    className="search-clear"
                    onClick={clearRecentSearches}
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto" id="recentSearchesList">
                  {recentSearches.map((search, index) => (
                    <div 
                      key={index} 
                      className="search-item"
                      onClick={() => {
                        setSearchQuery(search);
                        router.push(`/search?q=${encodeURIComponent(search)}`);
                      }}
                    >
                      {search}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
        
        {/* Notification Bell - Only render on client or when authenticated */}
        {hasMounted && isAuthenticated ? (
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
                id="notificationDropdown" 
                style={{ minWidth: '320px', maxWidth: '420px', position: 'fixed', zIndex: '9999', display: showNotifications ? 'block' : 'none' }}
              >
                <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="notification-title">Notifications</div>
                  <div className="notification-clear" style={{ cursor: 'pointer', color: '#9bdff8', fontSize: '0.9rem', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.25)' }} onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await notificationsApi.markAllAsRead();
                      setNotificationsPreview([]);
                      setUnreadCount(0);
                      window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: 0 }));
                    } catch (err) {
                      console.error('Failed to mark all read from header', err);
                    }
                  }}>
                    Clear all
                  </div>
                </div>
                <div className="notification-list" style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
                  {previewLoading ? (
                    <div className="text-center py-4 text-gray-400">Loading...</div>
                  ) : notificationsPreview.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">No notifications yet</div>
                  ) : (
                    notificationsPreview.map(n => (
                      <div key={n.id} className={`p-2 rounded-md ${!n.is_read ? 'bg-black/20' : ''}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (!n.is_read) {
                            await notificationsApi.markAsRead(n.id);
                            // update local preview
                            setNotificationsPreview(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                            const newCount = Math.max(0, unreadCount - 1);
                            setUnreadCount(newCount);
                            window.dispatchEvent(new CustomEvent('notifications:count:update', { detail: newCount }));
                          }
                        } catch (err) {
                          console.error('Failed to mark read', err);
                        }
                        // Navigate
                        if (n.story) router.push(`/stories/${n.story.slug}`);
                        else if (n.verse) router.push(`/verses/${n.verse.slug}`);
                        else if (n.sender) router.push(`/${n.sender.username}`);
                        else router.push('/notifications');
                      }}>
                        <div style={{ width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(90deg,#ff6b35,#8a4fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
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
                <div className="notification-footer" style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                  <Link href="/notifications" className="notification-view-all" style={{ cursor: 'pointer', color: '#9bdff8', textAlign: 'center', padding: '10px', display: 'block', margin: '0 8px', borderRadius: '8px', background: 'linear-gradient(90deg, rgba(0,212,255,0.1) 0%, rgba(155,223,248,0.1) 100%)', transition: 'all 0.2s ease', fontWeight: '500', textShadow: '0 0 10px rgba(155,223,248,0.5)', border: '1px solid rgba(155,223,248,0.2)' }}>
                    <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>View all notifications
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Placeholder div to maintain layout consistency
          <div className="w-10 h-10"></div>
        )}
        
        {/* Search icon for mobile */}
        <button 
          className="search-toggle w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105 md:hidden"
          id="mobileSearchToggle"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
        >
          <i className="fas fa-search text-white text-xl"></i>
        </button>
        
        {/* User menu or login button */}
        <div className="relative" id="userMenuContainer" ref={userMenuRef}>
          {hasMounted && isAuthenticated && currentUser ? (
            <>
              <button 
                className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(255,107,53,0.7)] transition-transform hover:scale-105 overflow-hidden"
                id="userMenuToggle"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {getProfileImageUrl(currentUser) ? (
                  <Image 
                    src={getProfileImageUrl(currentUser)} 
                    alt={`${getUsername(currentUser)}'s profile`} 
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getUserInitial(getUsername(currentUser))
                )}
              </button>
              
              <div className={`absolute right-0 mt-2 w-48 bg-gradient-to-b from-gray-900 to-black border border-neon-blue/30 rounded-lg shadow-lg z-50 overflow-hidden ${showUserMenu ? '' : 'hidden'}`} id="userMenuDropdown">
                <div className="p-3 border-b border-neon-blue/20">
                  <p className="text-white font-medium">{getUsername(currentUser)}</p>
                  <p className="text-gray-400 text-sm">{getUserEmail(currentUser)}</p>
                </div>
                <Link 
                  href={`/${getUsername(currentUser)}`}
                  className="w-full text-left px-4 py-3 text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-user"></i>
                  <span>Profile</span>
                </Link>
                <Link 
                  href="/saved"
                  className="w-full text-left px-4 py-3 text-white hover:bg-neon-blue/10 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-bookmark"></i>
                  <span>Saved</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 bg-transparent border-0"
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : hasMounted ? (
            // Login button when not authenticated
            <button 
              id="loginBtn"
              className="text-white hover:text-neon-blue transition-colors font-medium"
              onClick={() => {
                if (openAuthModal) {
                  openAuthModal();
                } else {
                  router.push('/login');
                }
              }}
            >
              Login
            </button>
          ) : (
            // Placeholder div during server rendering to maintain layout
            <div className="w-20 h-10"></div>
          )}
        </div>
      </div>
      
      {/* Search bar for mobile - appears when toggled */}
      {showMobileSearch && (
        <div id="mobileSearchBar" className="search-bar-mobile absolute top-16 left-4 right-4 z-50 animate-fadeIn">
          <form id="mobileSearchForm" onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                id="mobileSearchInput"
                name="q"
                placeholder="Search verses, tags, creators..."
                className="search-input w-full py-3 pl-12 pr-4 rounded-full bg-black/80 backdrop-blur-lg border-2 border-neon-blue text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-neon-blue text-xl"></i>
              <button 
                type="button"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                id="closeMobileSearch"
                onClick={() => setShowMobileSearch(false)}
              >
                <i className="fas fa-times"></i>
              </button>
              
              <div 
                className="search-dropdown"
                id="mobileSearchDropdown"
              >
                <div className="search-section">
                  <div className="search-section-title">
                    <h3 className="flex items-center gap-1">
                      <i className="fas fa-history"></i> Recent Searches
                    </h3>
                    <button 
                      className="search-clear"
                      id="clearRecentSearchesMobile"
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto" id="recentSearchesListMobile">
                    {recentSearches.map((search, index) => (
                      <div 
                        key={index} 
                        className="search-item"
                        onClick={() => {
                          setSearchQuery(search);
                          router.push(`/search?q=${encodeURIComponent(search)}`);
                        }}
                      >
                        {search}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Header;