'use client';

import React, { useEffect, useRef } from 'react';
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
    refreshAuth
  } = useMain(initialState);

  const { currentUser } = useAuth();
  const feedRef = useRef(null);

  // Setup infinite scroll
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const handleScroll = () => {
      if (
        feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 100 &&
        !isFetching &&
        hasNext
      ) {
        handleFetchMore();
      }
    };

    feed.addEventListener('scroll', handleScroll);
    return () => feed.removeEventListener('scroll', handleScroll);
  }, [isFetching, hasNext, handleFetchMore]);

  // Handle tag option click with authentication check
  const handleTagOptionClick = async (tagName) => {
    if (tagName === 'following' && !isAuthenticated) {
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } }));
      return;
    }

    if (currentTag === tagName) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  };

  // Listen for back/forward navigation so /tags/<tag> works with browser navigation
  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/^\/tags\/([^\/]+)\/?$/);
      const tag = m && m[1] ? decodeURIComponent(m[1]) : 'for-you';
      handleTagSwitch(tag);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [handleTagSwitch]);

  // Listen for global tag switch events dispatched by other UI (DimensionNav, links)
  useEffect(() => {
    const onTagSwitchEvent = (e) => {
      const tag = e?.detail?.tag || 'for-you';
      const force = !!e?.detail?.force;
      if (tag === 'following' && !isAuthenticated) {
        window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } }));
        return;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      handleTagSwitch(tag, { force });
    };

    window.addEventListener('tag:switch', onTagSwitchEvent);
    return () => window.removeEventListener('tag:switch', onTagSwitchEvent);
  }, [handleTagSwitch, isAuthenticated]);

  return (
    <div className="min-h-screen">
      <div 
        ref={feedRef}
        className={`image-feed ${currentDimension === 'verses_page' ? 'hidden' : ''}`} 
        id="imageFeed"
        style={{ height: '100vh', overflowY: 'auto', paddingTop: '80px' }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-orange"></div>
          </div>
        ) : (
          stories.map((story, index) => (
            <StoryCard 
              key={story.id || index} 
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
          ))
        )}

        {isFetching && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-orange"></div>
          </div>
        )}
      </div>

      <div
        id="tagSwitcher"
        className="absolute left-1/2 top-8 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full z-10 flex px-1 py-1"
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
