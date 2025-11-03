// FeedClient.js
'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import StoryCard from './components/StoryCard';
import useMain from '../../hooks/useMain';
import { useAuth } from '../../contexts/AuthContext';

export default function FeedClient({ initialState }) {
  const {
    stories,
    loading,
    hasNext,
    isFetching,
    currentTag,
    currentDimension,
    handleTagSwitch,
    handleFetchMore,
    handleLikeToggle,
    handleSaveToggle,
    handleFollowUser,
    handleOpenStoryVerses,
    isAuthenticated,
    refreshAuth,
    error
  } = useMain(initialState);

  const { currentUser } = useAuth();
  const feedRef = useRef(null);
  const sentinelRef = useRef(null);
  const preloadTimeoutRef = useRef(null);
  const [preloadTriggered, setPreloadTriggered] = useState(false);


  // safeFetchMore prevents duplicate fetches when aggressive preloading fires rapidly.
  // It short-circuits if a fetch is already in progress or a recent preload was triggered.
  const safeFetchMore = useCallback(async () => {
    if (isFetching || preloadTriggered) return null;

    try {
      setPreloadTriggered(true);
      // Clear any existing timeout before setting a new one
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }

      const result = await handleFetchMore();

      // Keep the preload lock for a short period to avoid duplicate calls
      preloadTimeoutRef.current = setTimeout(() => {
        setPreloadTriggered(false);
        preloadTimeoutRef.current = null;
      }, 1000);

      return result;
    } catch (e) {
      // Ensure we release the lock on error
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
      setPreloadTriggered(false);
      throw e;
    }
  }, [isFetching, preloadTriggered, handleFetchMore]);

  // Aggressive preloading strategy
  useEffect(() => {
    if (!hasNext || isFetching || preloadTriggered) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !preloadTriggered) {
          // Trigger preload much earlier - when user is 70% through current content
          // Use safeFetchMore to avoid race conditions when user scrolls very fast.
          safeFetchMore();
        }
      },
      {
        root: feedRef.current,
        rootMargin: '1000px', // Very aggressive - load 1000px before reaching bottom
        threshold: 0.01
      }
    );

    const node = sentinelRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [hasNext, isFetching, preloadTriggered, safeFetchMore, stories.length]);

  // cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
    };
  }, []);

  // NOTE: previous buffering logic (storiesBuffer) was removed because buffered
  // stories were never rendered/merged into main `stories`. This avoids
  // duplicate fetches and simplifies preload behavior.

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
      console.warn('Failed to update history state for tag URL', e);
    }

    handleTagSwitch(tagName);
  }, [currentTag, handleTagSwitch, isAuthenticated]);

  // Listen for back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/^\/tags\/([^\/]+)\/?$/);
      const tag = m && m[1] ? decodeURIComponent(m[1]) : 'for-you';
      // Immediately scroll to top so the UI reflects navigation while
      // handleTagSwitch may perform network work. handleTagSwitch itself
      // also sets the current tag in the hook, but scrolling here makes
      // the change feel instant to the user.
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

  // Create a unique key for each story card
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
          // Hide scrollbar for cleaner look
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-orange"></div>
          </div>
        ) : (
          <>
            {stories.map((story, index) => (
              <StoryCard 
                key={getStoryKey(story, index)} 
                story={story} 
                index={index} 
                viewType="feed"
                onLikeToggle={handleLikeToggle}
                onSaveToggle={handleSaveToggle}
                onFollowUser={handleFollowUser}
                onOpenStoryVerses={handleOpenStoryVerses}
                currentTag={currentTag}
                onTagSelect={handleTagOptionClick}
                isAuthenticated={isAuthenticated}
                openAuthModal={(type = null, data = null) => window.dispatchEvent(new CustomEvent('auth:open', { detail: { type, data } }))}
              />
            ))}
            
            {/* Invisible sentinel for triggering preload */}
            <div ref={sentinelRef} style={{ height: '1px', width: '100%' }}></div>
          </>
        )}

        {/* Minimal loading indicator that doesn't disrupt flow */}
        {isFetching && (
          <div className="flex justify-center items-center h-8 my-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent-orange opacity-70"></div>
          </div>
        )}
        
        {/* End of feed indicator */}
        {!hasNext && stories.length > 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            You&apos;ve seen all stories
          </div>
        )}

        {/* Error display with retry */}
        {error && (
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">{error}</p>
            <button 
              onClick={() => {
                safeFetchMore();
              }}
              className="px-3 py-1 bg-accent-orange text-white text-sm rounded hover:bg-accent-orange/90"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div
        id="tagSwitcher"
        className="fixed left-1/2 top-8 transform -translate-x-1/2 bg-black/50 rounded-full z-10 flex px-1 py-1"
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