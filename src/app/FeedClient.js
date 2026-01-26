// FeedClient.js - Static UI without backend logic
'use client';


import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StoryCard from './components/StoryCard';
import StoryCardSkeleton from './components/StoryCardSkeleton';
import ExploreCategoriesGrid from './components/ExploreCategoriesGrid';
import { storiesApi } from '../../lib/api';

export default function FeedClient({ initialTag = 'for-you', initialStories = [], initialNextCursor = null }) {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [currentTag, setCurrentTag] = useState(initialTag);
  const [stories, setStories] = useState(initialStories);
  const [loading, setLoading] = useState(initialStories.length === 0);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  const loadedTagsRef = React.useRef(new Set()); // Track which tags have been loaded in this session

  // Sync currentTag with initialTag if it changes (e.g., direct URL navigation)
  React.useEffect(() => {
    setCurrentTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    // Skip fetching when on explore tab (it shows categories instead)
    if (currentTag === 'explore') {
      setLoading(false);
      return;
    }

    const tagKey = `feed-scroll-${currentTag}`;
    const hasScrollData = sessionStorage.getItem(tagKey) !== null;
    const hasBeenLoaded = loadedTagsRef.current.has(currentTag);

    // If we have scroll data AND haven't forced a refresh, skip the fetch and restore directly
    if (hasScrollData && !refreshCount && hasBeenLoaded) {
      setLoading(false);
      setShouldRestoreScroll(true);
      return;
    }

    // Show loading state when switching tags or refreshing (but not on initial page load with hydrated data)
    const isInitialLoad = currentTag === initialTag && stories.length > 0 && !refreshCount;
    
    // Show skeleton loader immediately for tag switches (not initial load)
    if (!isInitialLoad) {
      setLoading(true);
    }
    setError(null);
    
    // Pass the tag as-is to the API (empty string for untagged)
    storiesApi.getPaginatedStories({ tag: currentTag })
      .then((data) => {
        setStories(data.results || data);
        setNextCursor(data.next_cursor || null);
        setLoading(false);
        setShouldRestoreScroll(true);
        loadedTagsRef.current.add(currentTag); // Mark this tag as loaded
      })
      .catch((err) => {
        setError('Failed to load stories.');
        setLoading(false);
        loadedTagsRef.current.add(currentTag); // Mark as loaded even on error to avoid repeated attempts
      });
  }, [currentTag, refreshCount, initialTag, stories.length]);

  // Hide skeleton loader after 300ms if data hasn't loaded yet (show old content instead)
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [loading, currentTag]);

  // Restore scroll position after stories load
  useEffect(() => {
    if (shouldRestoreScroll && !loading) {
      const timer = setTimeout(() => {
        const feedEl = document.getElementById('imageFeed');
        if (feedEl) {
          const savedScroll = sessionStorage.getItem(`feed-scroll-${currentTag}`);
          if (savedScroll) {
            feedEl.scrollTop = parseInt(savedScroll, 10);
          }
        }
        setShouldRestoreScroll(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [shouldRestoreScroll, loading, currentTag]);

  // Save scroll position when scrolling
  useEffect(() => {
    const feedEl = document.getElementById('imageFeed');
    if (!feedEl) return;

    const handleScroll = () => {
      sessionStorage.setItem(`feed-scroll-${currentTag}`, feedEl.scrollTop.toString());
    };

    feedEl.addEventListener('scroll', handleScroll);
    return () => feedEl.removeEventListener('scroll', handleScroll);
  }, [currentTag]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      // Pass the tag as-is to the API (empty string for untagged)
      const data = await storiesApi.getPaginatedStories({ tag: currentTag, cursor: nextCursor });
      setStories(prev => [...prev, ...(data.results || [])]);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      setError('Failed to load more stories.');
    } finally {
      setLoadingMore(false);
    }
  };

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

        {/* Show Explore Categories Grid when Explore tab is active */}
        {currentTag === 'explore' && (
          <ExploreCategoriesGrid
            onSelectCategory={(category) => {
              setCurrentTag(category);
              const feedEl = document.getElementById('imageFeed');
              if (feedEl) {
                feedEl.scrollTop = 0;
              }
            }}
            onClose={() => {
              setCurrentTag('for-you');
              const feedEl = document.getElementById('imageFeed');
              if (feedEl) {
                feedEl.scrollTop = 0;
              }
            }}
          />
        )}

        {/* Show stories for other tags */}
        {currentTag !== 'explore' && (
          <>
            {/* Loading state */}
            {loading && (
              <>
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

            {/* Load More button for pagination - appears after last story */}
            {!loading && nextCursor && (
              <div className="flex justify-center my-8">
                <button
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-accent-orange/90 to-neon-pink/90 text-white font-bold text-lg shadow-lg hover:scale-105 transition-all duration-150"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tag switcher navigation wrapper */}
      <div className="tag-switcher-wrapper">
        <div
          id="tagSwitcher"
          className="fixed left-1/2 top-8 transform -translate-x-1/2 bg-black/50 rounded-full z-10 flex px-1 py-1 shadow-2xl shadow-blue-500/40"
          style={{ 
            width: '90%', 
            maxWidth: '500px',
            border: '2px solid rgba(0, 212, 255, 0.5)'
          }}
        >
          {[
            { id: 'for-you', name: 'for-you', display_name: 'For You' },
            { id: 'collaborative', name: 'collaborative', display_name: 'Collab' },
            { id: 'explore', name: 'explore', display_name: 'Explore' },
            { id: 'following', name: 'following', display_name: 'Following', requiresAuth: true }
          ].map(option => {
            const isDisabled = option.requiresAuth && !isAuthenticated;
            const isActive = currentTag === option.name;
            const url = `/tags/${encodeURIComponent(option.name)}`;
            return (
              <a
                key={option.id}
                href={url}
                tabIndex={isDisabled ? -1 : 0}
                className={`tag-option ${option.name} px-2 text-center py-2 text-sm font-semibold cursor-pointer transition-all duration-150 ease-out transform-gpu flex-1 ${
                  isActive 
                    ? 'bg-linear-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100' 
                    : isDisabled
                      ? 'text-white/40 cursor-not-allowed opacity-50'
                      : 'text-white/80 hover:text-white hover:bg-white/10 opacity-60 hover:opacity-90'
                } rounded-full focus:outline-none focus:ring-2 focus:ring-neon-blue/50 truncate`}
                onClick={e => {
                  e.preventDefault();
                  if (!isDisabled) handleTagOptionClick(option.name);
                }}
              >
                {option.display_name}
                {isDisabled && ' (Login Required)'}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}