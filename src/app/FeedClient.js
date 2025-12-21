// FeedClient.js - Static UI without backend logic
'use client';


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StoryCard from './components/StoryCard';
import StoryCardSkeleton from './components/StoryCardSkeleton';
import { storiesApi } from '../../lib/api';

export default function FeedClient({ initialTag = 'for-you' }) {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [currentTag, setCurrentTag] = useState(initialTag);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef(null);

  // Sync currentTag with initialTag if it changes (e.g., direct URL navigation)
  React.useEffect(() => {
    setCurrentTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    storiesApi.getPaginatedStories({ tag: currentTag })
      .then((data) => {
        setStories(data.results || data);
        setNextCursor(data.next_cursor || null);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load stories.');
        setLoading(false);
      });
  }, [currentTag, refreshCount]);

  // Infinite scroll: load more when loaderRef is visible
  useEffect(() => {
    if (!nextCursor) return;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true);
          setError(null);
          storiesApi.getPaginatedStories({ tag: currentTag, cursor: nextCursor })
            .then((data) => {
              setStories(prev => [...prev, ...(data.results || [])]);
              setNextCursor(data.next_cursor || null);
            })
            .catch(() => setError('Failed to load more stories.'))
            .finally(() => setLoadingMore(false));
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [nextCursor, loadingMore, currentTag]);

  const handleTagOptionClick = useCallback((tagName) => {
    // Always scroll feed to top
    const feedEl = document.getElementById('imageFeed');
    if (feedEl) {
      feedEl.scrollTop = 0;
      if (feedEl.scrollTop !== 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (tagName === currentTag) {
      setRefreshCount((c) => c + 1); // force reload
    } else {
      setCurrentTag(tagName);
    }
  }, [currentTag]);

  // Listen for 'tag:switch' event (e.g., from DimensionNav Home)
  useEffect(() => {
    const handler = (e) => {
      const tag = e.detail?.tag || 'for-you';
      handleTagOptionClick(tag);
    };
    window.addEventListener('tag:switch', handler);
    return () => window.removeEventListener('tag:switch', handler);
  }, [handleTagOptionClick]);

  return (
    <div className="min-h-screen">
      <div className="image-feed" id="imageFeed">

        {/* Loading state */}
        {loading && (
          <>
            <StoryCardSkeleton />
            <StoryCardSkeleton />
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="text-red-500 text-center my-4">{error}</div>
        )}

        {/* Rendered story cards */}
        {!loading && !error && stories.length === 0 && (
          <div className="text-center text-gray-400 my-8">No stories found.</div>
        )}
        {!loading && !error && stories.map((story, index) => (
          <div key={`${story.id || story.slug || index}-${index}`}>
            <StoryCard 
              story={story} 
              index={index} 
              viewType="feed"
              currentTag={currentTag}
              onTagSelect={handleTagOptionClick}
              isAuthenticated={isAuthenticated}
              openAuthModal={openAuthModal}
            />
          </div>
        ))}

        {/* Infinite scroll loader sentinel */}
        <div ref={loaderRef} style={{ height: 32 }} />
        {loadingMore && (
          <div className="text-center text-gray-400 my-4">Loading more...</div>
        )}
      </div>

      {/* Tag switcher navigation */}
      <div
        id="tagSwitcher"
        className="fixed left-1/2 top-8 transform -translate-x-1/2 bg-black/50 rounded-full z-10 flex px-1 py-1 justify-center items-center"
        style={{ 
          width: '90%', 
          maxWidth: '500px',
          border: '2px solid rgba(80, 105, 219, 0.4)'
        }}
      >
        <div className="flex justify-center items-center w-full gap-2">
          {[
            { id: 'for-you', name: 'for-you', display_name: 'For You' },
            { id: 'trending', name: 'trending', display_name: 'Trending' },
            { id: 'recent', name: 'recent', display_name: 'Recent' },
            { id: 'following', name: 'following', display_name: 'Following', requiresAuth: true }
          ].map(option => {
            const isDisabled = option.requiresAuth;
            const isActive = currentTag === option.name;
            const url = `/tags/${encodeURIComponent(option.name)}`;
            return (
              <a
                key={option.id}
                href={url}
                tabIndex={isDisabled ? -1 : 0}
                className={`tag-option ${option.name} px-2 py-2 text-sm font-semibold cursor-pointer transition-all duration-150 ease-out transform-gpu flex-1 text-center ${
                  isActive 
                    ? 'bg-linear-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100' 
                    : isDisabled
                      ? 'text-white/40 cursor-not-allowed opacity-50'
                      : 'text-white/80 hover:text-white hover:bg-white/10 opacity-60 hover:opacity-90'
                } rounded-full focus:outline-none focus:ring-2 focus:ring-neon-blue/50`}
                onClick={e => {
                  e.preventDefault();
                  if (!isDisabled) handleTagOptionClick(option.name);
                }}
              >
                {option.display_name}
                {isDisabled }
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}