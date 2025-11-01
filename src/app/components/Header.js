// Header component - WITH AUTO-SUGGEST FUNCTIONALITY
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { notificationsApi, searchApi, absoluteUrl } from '../../../lib/api';
import debounce from 'lodash/debounce';

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
  
  // New state for auto-suggest functionality
  const [results, setResults] = useState({
    stories: [],
    verses: [],
    creators: [],
    loading: false
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  
  // Refs for DOM elements
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const desktopSearchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const mobileSearchBarRef = useRef(null);
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
      // Close suggestions dropdown when clicking outside
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
      // Close mobile search bar when clicking outside
      if (showMobileSearch && mobileSearchBarRef.current && !mobileSearchBarRef.current.contains(event.target)) {
        setShowMobileSearch(false);
      }
    };

    // Handle scroll event to close mobile search
    const handleScroll = () => {
      if (showMobileSearch) {
        setShowMobileSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showMobileSearch]);

  // Auto-focus desktop search when page loads
  useEffect(() => {
    if (hasMounted && desktopSearchInputRef.current) {
      // You can uncomment this if you want the search to be focused on page load
      // desktopSearchInputRef.current.focus();
    }
  }, [hasMounted]);

  // Auto-focus mobile search when it's opened
  useEffect(() => {
    if (showMobileSearch && mobileSearchInputRef.current) {
      // Small timeout to ensure the element is fully rendered
      setTimeout(() => {
        mobileSearchInputRef.current.focus();
      }, 100);
    }
  }, [showMobileSearch]);

  // Fetch unread count on mount and subscribe to updates
  useEffect(() => {
    let mounted = true;
    
    // Function to fetch unread count
    const fetchUnreadCount = async () => {
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
    };
    
    // Initial fetch
    fetchUnreadCount();
    
    // Set up interval to refresh unread count every 30 seconds
    const intervalId = setInterval(fetchUnreadCount, 30000);
    
    // Custom event listener for real-time updates
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

  // Handle search input changes with auto-suggest
  const handleSearchInput = (e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    // Trigger debounced search immediately on user input for real-time results
    debouncedSearch(newQuery);
    if (newQuery && newQuery.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Clear search input
  const clearSearchInput = (e) => {
    e.preventDefault();
    setSearchQuery('');
    setShowSuggestions(false);
    if (mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  };

  // Debounced search function (useMemo to keep same instance while router is stable)
  const debouncedSearch = useMemo(() => debounce(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(prev => ({ ...prev, stories: [], verses: [], creators: [], loading: false }));
      return;
    }

    try {
      setResults(prev => ({ ...prev, loading: true }));
      
      // Use the searchApi functions instead of direct apiRequest calls
      const [storiesRes, versesRes, creatorsRes] = await Promise.allSettled([
        searchApi.searchStories(searchQuery),
        searchApi.searchVerses(searchQuery),
        searchApi.searchCreators(searchQuery)
      ]);

      // Process the results
      const newResults = {
        stories: storiesRes.status === 'fulfilled' && storiesRes.value ? storiesRes.value : [],
        verses: versesRes.status === 'fulfilled' && versesRes.value ? versesRes.value : [],
        creators: creatorsRes.status === 'fulfilled' && creatorsRes.value ? creatorsRes.value : [],
        loading: false
      };

      setResults(newResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults(prev => ({ ...prev, loading: false }));
    }
  }, 120), [router]);

  // Navigate when selecting a suggestion
  const navigateToSuggestion = (sugg) => {
    try {
      if (!sugg) return;
      if (sugg.type === 'story') {
        const slug = sugg.slug || sugg.story_slug || (sugg.id ? sugg.id : null);
        if (slug) router.push(`/stories/${encodeURIComponent(slug)}/`);
      } else if (sugg.type === 'creator') {
        const username = sugg.username || sugg.user || sugg.creator_username;
        if (username) router.push(`/${encodeURIComponent(username)}`);
      } else if (sugg.type === 'verse') {
        const storySlug = sugg.story_slug || (sugg.story && (sugg.story.slug || sugg.story.story_slug)) || null;
        const verseId = sugg.id || sugg.public_id || sugg.slug || null;
        if (storySlug && verseId) {
          router.push(`/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(verseId)}`);
        } else if (storySlug) {
          router.push(`/stories/${encodeURIComponent(storySlug)}/`);
        }
      }
    } catch (e) {
      console.warn('navigateToSuggestion failed', e);
    } finally {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      setShowMobileSearch(false); // Close mobile search after navigation
    }
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    
    const totalSuggestions = results.stories.slice(0,5).length + 
                            results.creators.slice(0,5).length + 
                            results.verses.slice(0,5).length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < totalSuggestions - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0) {
        const stories = results.stories.slice(0,5);
        const creators = results.creators.slice(0,5);
        const verses = results.verses.slice(0,5);
        
        if (activeSuggestionIndex < stories.length) {
          navigateToSuggestion({ ...stories[activeSuggestionIndex], type: 'story' });
        } else if (activeSuggestionIndex < stories.length + creators.length) {
          navigateToSuggestion({ ...creators[activeSuggestionIndex - stories.length], type: 'creator' });
        } else {
          navigateToSuggestion({ ...verses[activeSuggestionIndex - stories.length - creators.length], type: 'verse' });
        }
      } else {
        handleSearch(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  // Ensure debounced search is cancelled on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      try { debouncedSearch.cancel(); } catch (e) { /* ignore */ }
    };
  }, [debouncedSearch]);

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
      setShowSuggestions(false);
      setShowMobileSearch(false); // Close mobile search after navigation
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
      
      <div className="flex gap-4 items-center ml-auto relative" id="searchContainer" ref={searchContainerRef}>
        {/* Search bar for desktop - only visible when not mobile */}
        <form className="search-bar-desktop hidden md:block" id="desktopSearchForm" onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              id="desktopSearchInput"
              name="q"
              ref={desktopSearchInputRef} // Add ref for desktop search
              placeholder="Search verses, tags, creators..."
              className="search-input w-64 py-2.5 pl-10 pr-10 rounded-full bg-black/30 backdrop-blur-md border border-neon-blue/50 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
              value={searchQuery}
              onChange={handleSearchInput}
              onKeyDown={handleKeyDown}
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neon-blue"></i>
            
            {/* Clear button for desktop search */}
            {searchQuery && (
              <button 
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                onClick={clearSearchInput}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
            
            {/* Auto-suggest dropdown */}
            {showSuggestions && (results.stories.length > 0 || results.creators.length > 0 || results.verses.length > 0) && (
              <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-gray-700 rounded-2xl shadow-xl z-50 max-h-72 overflow-auto">
                <div className="p-2">
                  {results.stories.slice(0,5).map((s, i) => (
                    <div 
                      key={`s-${s.id || s.slug || i}`} 
                      className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === i ? 'bg-slate-800' : ''}`} 
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        navigateToSuggestion({ ...s, type: 'story' }); 
                      }}
                    >
                      <div className="text-sm font-semibold text-white truncate">{s.title || s.story_title || s.slug}</div>
                      <div className="text-xs text-gray-400 truncate">Story</div>
                    </div>
                  ))}

                  {results.creators.slice(0,5).map((c, j) => (
                    <div 
                      key={`c-${c.id || c.username || j}`} 
                      className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === (results.stories.slice(0,5).length + j) ? 'bg-slate-800' : ''}`} 
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        navigateToSuggestion({ ...c, type: 'creator' }); 
                      }}
                    >
                      <div className="text-sm font-semibold text-white">{c.display_name || c.username}</div>
                      <div className="text-xs text-gray-400">Creator</div>
                    </div>
                  ))}

                  {results.verses.slice(0,5).map((v, k) => (
                    <div 
                      key={`v-${v.id || v.public_id || k}`} 
                      className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === (results.stories.slice(0,5).length + results.creators.slice(0,5).length + k) ? 'bg-slate-800' : ''}`} 
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        navigateToSuggestion({ ...v, type: 'verse' }); 
                      }}
                    >
                      <div className="text-sm font-semibold text-white truncate">{(v.title && v.title.trim()) || (v.content && String(v.content).slice(0,60)) || `Verse ${v.id || v.public_id || ''}`}</div>
                      <div className="text-xs text-gray-400">Verse</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search Dropdown - Recent Searches */}
            {!showSuggestions && (
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
            )}
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
        <div id="mobileSearchBar" className="search-bar-mobile absolute top-16 left-4 right-4 z-50 animate-fadeIn" ref={mobileSearchBarRef}>
          <form id="mobileSearchForm" onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                id="mobileSearchInput"
                name="q"
                ref={mobileSearchInputRef} // Add ref for mobile search
                placeholder="Search verses, tags, creators..."
                className="search-input w-full py-3 pl-12 pr-12 rounded-full bg-black/80 backdrop-blur-lg border-2 border-neon-blue text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
                value={searchQuery}
                onChange={handleSearchInput}
                onKeyDown={handleKeyDown}
              />
              <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-neon-blue text-xl"></i>
              
              {/* Clear button for mobile search */}
              {searchQuery ? (
                <button 
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                  onClick={clearSearchInput}
                >
                  <i className="fas fa-times"></i>
                </button>
              ) : (
                <button 
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                  id="closeMobileSearch"
                  onClick={() => setShowMobileSearch(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              
              {/* Auto-suggest dropdown for mobile */}
              {showSuggestions && (results.stories.length > 0 || results.creators.length > 0 || results.verses.length > 0) && (
                <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-gray-700 rounded-2xl shadow-xl z-50 max-h-72 overflow-auto">
                  <div className="p-2">
                    {results.stories.slice(0,5).map((s, i) => (
                      <div 
                        key={`s-${s.id || s.slug || i}`} 
                        className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === i ? 'bg-slate-800' : ''}`} 
                        onMouseDown={(e) => { 
                          e.preventDefault(); 
                          navigateToSuggestion({ ...s, type: 'story' }); 
                        }}
                      >
                        <div className="text-sm font-semibold text-white truncate">{s.title || s.story_title || s.slug}</div>
                        <div className="text-xs text-gray-400 truncate">Story</div>
                      </div>
                    ))}

                    {results.creators.slice(0,5).map((c, j) => (
                      <div 
                        key={`c-${c.id || c.username || j}`} 
                        className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === (results.stories.slice(0,5).length + j) ? 'bg-slate-800' : ''}`} 
                        onMouseDown={(e) => { 
                          e.preventDefault(); 
                          navigateToSuggestion({ ...c, type: 'creator' }); 
                        }}
                      >
                        <div className="text-sm font-semibold text-white">{c.display_name || c.username}</div>
                        <div className="text-xs text-gray-400">Creator</div>
                      </div>
                    ))}

                    {results.verses.slice(0,5).map((v, k) => (
                      <div 
                        key={`v-${v.id || v.public_id || k}`} 
                        className={`p-2 rounded hover:bg-slate-800 cursor-pointer ${activeSuggestionIndex === (results.stories.slice(0,5).length + results.creators.slice(0,5).length + k) ? 'bg-slate-800' : ''}`} 
                        onMouseDown={(e) => { 
                          e.preventDefault(); 
                          navigateToSuggestion({ ...v, type: 'verse' }); 
                        }}
                      >
                        <div className="text-sm font-semibold text-white truncate">{(v.title && v.title.trim()) || (v.content && String(v.content).slice(0,60)) || `Verse ${v.id || v.public_id || ''}`}</div>
                        <div className="text-xs text-gray-400">Verse</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Searches dropdown for mobile */}
              {!showSuggestions && (
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
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Header;