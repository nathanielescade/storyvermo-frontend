// FeedClient.js - 🚀 CURSOR-BASED INFINITE SCROLL with skeleton loaders
'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import StoryCard from './components/StoryCard';
import StoryCardSkeleton from './components/StoryCardSkeleton';
import useMain from '../../hooks/useMain';
import { useAuth } from '../../contexts/AuthContext';

export default function FeedClient({ initialState }) {
  const {
    stories,
    loading,
    hasMore,
    isFetching,
    currentTag,
    currentDimension,
    handleTagSwitch,
    handleFetchMore,
    handleFollowUser,
    handleOpenStoryVerses,
    isAuthenticated,
    refreshAuth,
    refreshStories,
    error,
    prefetchNext
  } = useMain(initialState);

  const { currentUser } = useAuth();
  const feedRef = useRef(null);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // Use stories as-is - moment images are already stripped on the API side
  const feedStories = useMemo(() => stories, [stories]);

  // 💾 Restore scroll position when returning to feed
  useEffect(() => {
    if (typeof window === 'undefined' || !feedRef.current) return;
    
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      try {
        const scrollPos = sessionStorage.getItem('feedScrollPos');
        if (scrollPos && feedRef.current) {
          feedRef.current.scrollTop = parseInt(scrollPos, 10);
          sessionStorage.removeItem('feedScrollPos'); // Clear after restoring
        }
      } catch (e) {
        // Silently fail if sessionStorage is unavailable
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [feedStories.length]); // Restore when stories load

  // 💾 Save scroll position before navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      if (feedRef.current) {
        try {
          sessionStorage.setItem('feedScrollPos', String(feedRef.current.scrollTop));
        } catch (e) {
          // Silently fail
        }
      }
    };

    // Save scroll position when user navigates away
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also intercept link clicks (for client-side navigation)
    const handleLinkClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href && !target.target) {
        if (feedRef.current) {
          try {
            sessionStorage.setItem('feedScrollPos', String(feedRef.current.scrollTop));
          } catch (e) {
            // Silently fail
          }
        }
      }
    };

    document.addEventListener('click', handleLinkClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  // 🚀 INTERSECTION OBSERVER for automatic infinite scroll trigger
  useEffect(() => {
    if (!hasMore || isFetching) return;
    const root = feedRef.current;
    if (!root || !sentinelRef.current) return;

    // Disconnect previous observer
    if (observerRef.current) observerRef.current.disconnect();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // User has scrolled near the end - load more
          handleFetchMore();
        }
      },
      {
        root: root,
        // Trigger when sentinel is 300px away from viewport bottom
        rootMargin: '300px',
        threshold: 0.01
      }
    );

    observerRef.current = io;
    io.observe(sentinelRef.current);

    return () => {
      try { io.disconnect(); } catch (e) { /* ignore */ }
      observerRef.current = null;
    };
  }, [hasMore, isFetching, handleFetchMore]);

  // Pre-fetch next page as user scrolls (for smooth loading)
  useEffect(() => {
    if (!hasMore || isFetching) return;
    const root = feedRef.current;
    if (!root || !sentinelRef.current) return;

    const prefetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // User is nearing the end - prefetch next page
          try {
            prefetchNext();
          } catch (e) {
            // Silently fail
          }
        }
      },
      {
        root: root,
        rootMargin: '600px', // Prefetch earlier than load trigger
        threshold: 0.01
      }
    );

    if (sentinelRef.current) {
      prefetchObserver.observe(sentinelRef.current);
    }

    return () => {
      try { prefetchObserver.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [hasMore, isFetching, prefetchNext]);

  // Listen for successful login/signup
  useEffect(() => {
    const handleAuthSuccess = () => {
      setTimeout(() => {
        refreshStories();
      }, 150);
    };

    window.addEventListener('auth:success', handleAuthSuccess);
    return () => window.removeEventListener('auth:success', handleAuthSuccess);
  }, [refreshStories]);

  // Handle tag option click with authentication check
  const handleTagOptionClick = useCallback(async (tagName) => {
    if (tagName === 'following' && !isAuthenticated) {
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } }));
      return;
    }

    if (currentTag === tagName) {
      if (feedRef.current) {
        feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      handleTagSwitch(tagName, { force: true });
      return;
    }

    try {
      const slug = encodeURIComponent(String(tagName).toLowerCase().replace(/\s+/g,'-'));
      const newUrl = tagName === 'for-you' ? '/' : `/tags/${slug}/`;
      window.history.pushState({}, '', newUrl);
    } catch (e) {
      // Ignore navigation errors
    }

    handleTagSwitch(tagName);
  }, [currentTag, handleTagSwitch, isAuthenticated]);

  // Listen for trending tag selection from Header
  useEffect(() => {
    const handleTrendingTagSelected = (e) => {
      const tagName = e?.detail?.tagName;
      if (tagName) {
        handleTagOptionClick(tagName);
      }
    };

    window.addEventListener('trending:tag_selected', handleTrendingTagSelected);
    return () => window.removeEventListener('trending:tag_selected', handleTrendingTagSelected);
  }, [handleTagOptionClick]);

  // Listen for back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/^\/tags\/([^\/]+)\/?$/);
      const tag = m && m[1] ? decodeURIComponent(m[1]) : 'for-you';
      if (feedRef.current) {
        try {
          feedRef.current.scrollTo({ top: 0 });
        } catch (e) {
          // ignore scroll errors in non-DOM contexts
        }
      }

      handleTagSwitch(tag);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [handleTagSwitch]);

  // Listen for global tag switch events
  useEffect(() => {
    const onTagSwitchEvent = (e) => {
      const tag = e?.detail?.tag || 'for-you';
      const force = !!e?.detail?.force;
      if (tag === 'following' && !isAuthenticated) {
        window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } }));
        return;
      }
      if (feedRef.current) {
        feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      handleTagSwitch(tag, { force });
    };

    window.addEventListener('tag:switch', onTagSwitchEvent);
    return () => window.removeEventListener('tag:switch', onTagSwitchEvent);
  }, [handleTagSwitch, isAuthenticated]);



  
  // Create unique key for story cards
  const getStoryKey = useCallback((story, index) => {
    if (story.id && story.slug) {
      return `${story.id}-${story.slug}`;
    }
    return `${story.id || 'story'}-${index}`;
  }, []);

  return (
    <div className="min-h-screen">
      <div 
        ref={feedRef}
        className={`image-feed ${currentDimension === 'verses_page' ? 'hidden' : ''}`} 
        id="imageFeed"
        style={{ 
          height: 'calc(100vh - 80px)',
          overflowY: 'auto', 
          paddingTop: '80px',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* Custom scrollbar styling */}
        <style jsx>{`
          #imageFeed::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Initial loading state - show skeleton loaders instead of "no stories" */}
        {loading || feedStories.length === 0 ? (
          loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-orange"></div>
            </div>
          ) : (
            // Show skeleton loaders while waiting for data on first load
            <div className="space-y-4 px-4">
              {[1, 2, 3].map((i) => (
                <StoryCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          )
        ) : (
          <>
            {/* Rendered story cards */}
            {feedStories.map((story, index) => (
              <div key={getStoryKey(story, index)}>
                <StoryCard 
                  story={story} 
                  index={index} 
                  viewType="feed"
                  onFollowUser={handleFollowUser}
                  onOpenStoryVerses={handleOpenStoryVerses}
                  currentTag={currentTag}
                  onTagSelect={handleTagOptionClick}
                  isAuthenticated={isAuthenticated}
                  openAuthModal={(type = null, data = null) => 
                    window.dispatchEvent(new CustomEvent('auth:open', { detail: { type, data } }))
                  }
                />
              </div>
            ))}

            {/* INFINITE SCROLL: Show skeleton loaders while fetching */}
            {isFetching && (
              <div className="space-y-4 px-4">
                {/* Show 2-3 skeleton cards while loading */}
                {[1, 2, 3].map((i) => (
                  <StoryCardSkeleton key={`skeleton-${i}`} />
                ))}
              </div>
            )}

            {/* End of feed indicator */}
            {!hasMore && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">You&apos;ve seen all stories</p>
                <button
                  onClick={() => handleTagSwitch('for-you', { force: true })}
                  className="mt-4 px-4 py-2 text-accent-orange hover:underline text-sm"
                >
                  Refresh feed
                </button>
              </div>
            )}

            {/* Sentinel element for intersection observer */}
            <div 
              ref={sentinelRef} 
              style={{ height: '2px', width: '100%' }} 
              aria-hidden="true"
              className="my-8"
            />

            {/* Error state with retry */}
            {error && (
              <div className="mx-4 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-700 text-sm mb-3">{error}</p>
                <button 
                  onClick={() => {
                    handleFetchMore();
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tag switcher navigation */}
      <div
        id="tagSwitcher"
        className="fixed left-1/2  top-8 transform -translate-x-1/2 bg-black/50 rounded-full z-10 flex px-1 py-1"
        style={{ 
          width: '90%', 
          maxWidth: '500px',
          border: '2px solid rgba(80, 105, 219, 0.4)'
        }}
      >
        {[
          { id: 'for-you', name: 'for-you', display_name: 'For You' },
          { id: 'trending', name: 'trending', display_name: 'Trending' },
          { id: 'recent', name: 'recent', display_name: 'Recent' },
          { id: 'following', name: 'following', display_name: 'Following', requiresAuth: true }
        ].map(option => {
          const isDisabled = option.requiresAuth && !isAuthenticated;
          const isActive = currentTag === option.name;
          
          return (
            <button
              key={option.id}
              type="button"
              disabled={isDisabled}
              className={`tag-option ${option.name} px-2 py-2 text-sm font-semibold cursor-pointer transition-all duration-150 ease-out transform-gpu flex-1 ${
                isActive 
                  ? 'bg-linear-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100' 
                  : isDisabled
                    ? 'text-white/40 cursor-not-allowed opacity-50'
                    : 'text-white/80 hover:text-white hover:bg-white/10 opacity-60 hover:opacity-90'
              } rounded-full focus:outline-none focus:ring-2 focus:ring-neon-blue/50 truncate`}
              onClick={() => handleTagOptionClick(option.name)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {option.display_name}
              {isDisabled && ' (Login Required)'}
            </button>
          );
        })}
      </div>
    </div>
  );
} 