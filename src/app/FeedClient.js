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
  const [preloadTriggered, setPreloadTriggered] = useState(false);
  const [storiesBuffer, setStoriesBuffer] = useState([]);
  const [isBuffering, setIsBuffering] = useState(false);

  // Aggressive preloading strategy
  useEffect(() => {
    if (!hasNext || isFetching || preloadTriggered) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !preloadTriggered) {
          // Trigger preload much earlier - when user is 70% through current content
          handleFetchMore();
          setPreloadTriggered(true);
          
          // Reset after a short delay to allow next preload
          setTimeout(() => setPreloadTriggered(false), 1000);
        }
      },
      {
        root: feedRef.current,
        rootMargin: '1000px', // Very aggressive - load 1000px before reaching bottom
        threshold: 0.01
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [isFetching, hasNext, handleFetchMore, preloadTriggered, stories.length]);

  // Buffer management for seamless loading
  useEffect(() => {
    if (stories.length > 0 && !isBuffering) {
      // When we have stories but buffer is empty, start buffering next page
      if (storiesBuffer.length === 0 && hasNext && !isFetching) {
        setIsBuffering(true);
        handleFetchMore().then(() => {
          setIsBuffering(false);
        });
      }
    }
  }, [stories, storiesBuffer, hasNext, isFetching, handleFetchMore, isBuffering]);

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
    return `${story.id || 'story'}-${index}-${Date.now()}`;
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
            You've seen all stories
          </div>
        )}

        {/* Error display with retry */}
        {error && (
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">{error}</p>
            <button 
              onClick={() => {
                handleFetchMore();
                setPreloadTriggered(false);
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