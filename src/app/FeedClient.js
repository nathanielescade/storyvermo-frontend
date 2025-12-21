// FeedClient.js - Complete Infinite Scroll Implementation
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StoryCard from './components/StoryCard';
import StoryCardSkeleton from './components/StoryCardSkeleton';
import { storiesApi } from '../../lib/api';

// Helper to extract tag from URL (assuming /tags/[tag] or homepage)
function getTagFromUrl() {
  if (typeof window === 'undefined') return 'for-you';
  const path = window.location.pathname;
  const match = path.match(/\/tags\/([^/]+)/);
  if (match) return decodeURIComponent(match[1]);
  // Optionally, handle homepage as 'for-you'
  if (path === '/' || path === '/feed') return 'for-you';
  return 'for-you';
}

export default function FeedClient({ initialTag = 'for-you' }) {
  const { isAuthenticated, openAuthModal } = useAuth();

  // State management
  const [currentTag, setCurrentTag] = useState(initialTag);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skeletons, setSkeletons] = useState([]);
  const loaderRef = useRef(null);
  const preloadRef = useRef(null);


  // Sync currentTag with initialTag if it changes
  useEffect(() => {
    setCurrentTag(initialTag);
  }, [initialTag]);

  // Listen for browser navigation (back/forward) and update currentTag, restore scroll
  useEffect(() => {
    const onPopState = () => {
      const tag = getTagFromUrl();
      setCurrentTag(tag);
      // Restore scroll position after a short delay to allow feed to render
      setTimeout(() => {
        const feedEl = document.getElementById('imageFeed');
        const scroll = parseInt(sessionStorage.getItem('feed-scroll') || '0', 10);
        if (feedEl) {
          feedEl.scrollTop = scroll;
        } else {
          window.scrollTo(0, scroll);
        }
      }, 100);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Fetch initial stories
  useEffect(() => {
    const fetchInitialStories = async () => {
      setLoading(true);
      setError(null);
      setStories([]);
      setNextCursor(null);
      setHasMore(true);
      
      try {
        const data = await storiesApi.getPaginatedStories({ 
          tag: currentTag,
          limit: 12  // Initial load size
        });
        
        // Filter out duplicate stories by id or slug
        const arr = data.results || data;
        const seen = new Set();
        const uniqueStories = arr.filter(s => {
          const key = s.id || s.slug;
          if (!key) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setStories(uniqueStories);
        setNextCursor(data.next_cursor);
        setHasMore(data.has_more !== false);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Failed to load stories.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialStories();
  }, [currentTag, refreshCount]);

  // Show skeletons when loading more
  useEffect(() => {
    if (loadingMore) {
      // Create skeleton data
      const newSkeletons = Array(5).fill().map((_, i) => ({ id: `skeleton-${Date.now()}-${i}` }));
      setSkeletons(newSkeletons);
    } else {
      setSkeletons([]);
    }
  }, [loadingMore]);

  // Infinite scroll with IntersectionObserver (preload when 3 from end)
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    let observer;
    if (preloadRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMoreStories();
          }
        },
        {
          root: null,
          rootMargin: '200px', // Preload a bit before
          threshold: 0.1
        }
      );
      observer.observe(preloadRef.current);
    }
    return () => {
      if (observer && preloadRef.current) {
        observer.unobserve(preloadRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, nextCursor, currentTag, stories.length]);

  // Load more stories
  const loadMoreStories = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    
    setLoadingMore(true);
    
    try {
      const data = await storiesApi.getPaginatedStories({ 
        tag: currentTag,
        cursor: nextCursor,
        limit: 10  // Load size for subsequent pages
      });
      
      // Add new stories to existing ones, filtering out duplicates by id or slug
      setStories(prev => {
        const existingIds = new Set(prev.map(s => s.id || s.slug));
        const newStories = (data.results || []).filter(s => {
          const key = s.id || s.slug;
          if (!key) return true;
          if (existingIds.has(key)) return false;
          existingIds.add(key);
          return true;
        });
        return [...prev, ...newStories];
      });
      setNextCursor(data.next_cursor);
      setHasMore(data.has_more !== false);
    } catch (err) {
      console.error('Error loading more stories:', err);
      setError('Failed to load more stories.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle tag switch
  const handleTagOptionClick = useCallback((tagName) => {
    // Save scroll position before switching
    const feedEl = document.getElementById('imageFeed');
    if (feedEl) {
      sessionStorage.setItem('feed-scroll', feedEl.scrollTop);
      feedEl.scrollTop = 0;
      if (feedEl.scrollTop !== 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      sessionStorage.setItem('feed-scroll', window.scrollY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (tagName === currentTag) {
      setRefreshCount((c) => c + 1); // Force reload
    } else {
      // Push new URL to history so popstate works
      const url = `/tags/${encodeURIComponent(tagName)}`;
      window.history.pushState({}, '', url);
      setCurrentTag(tagName);
    }
  }, [currentTag]);

  // Listen for 'tag:switch' event
  useEffect(() => {
    const handler = (e) => {
      const tag = e.detail?.tag || 'for-you';
      handleTagOptionClick(tag);
    };
    window.addEventListener('tag:switch', handler);
    return () => window.removeEventListener('tag:switch', handler);
  }, [handleTagOptionClick]);

  // Retry loading on error
  const handleRetry = () => {
    if (stories.length === 0) {
      setRefreshCount(c => c + 1); // Retry initial load
    } else {
      setLoadingMore(true);
      loadMoreStories(); // Retry loading more
    }
  };

  return (
    <div className="min-h-screen">
      <div className="image-feed" id="imageFeed">

        {/* Initial loading state */}
        {loading && (
          <>
            <StoryCardSkeleton />
            <StoryCardSkeleton />
            <StoryCardSkeleton />
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center my-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={handleRetry}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              Try Again
            </button>
          </div>
        )}


        {/* Rendered story cards */}
        {!loading && !error && stories.map((story, index) => {
          // Place the preload sentinel after the (N-5)th story (preload earlier)
          const isPreloadSentinel =
            hasMore &&
            stories.length > 5 &&
            index === stories.length - 5;
          return (
            <React.Fragment key={`${story.id || story.slug || index}-${index}`}>
              <div className="mb-6">
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
              {isPreloadSentinel && (
                <div ref={preloadRef} style={{ height: 1 }} />
              )}
            </React.Fragment>
          );
        })}

        {/* Skeleton loaders when loading more */}
        {skeletons.map((skeleton) => (
          <div key={skeleton.id} className="mb-6">
            <StoryCardSkeleton />
          </div>
        ))}

        {/* Infinite scroll loader sentinel */}
        <div ref={loaderRef} className="h-20 flex items-center justify-center">
          {loadingMore && (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-500 text-sm">Loading more stories...</p>
            </div>
          )}
          
          {!hasMore && stories.length > 0 && !loadingMore && (
            <div className="text-center py-4 text-gray-500">
              <div className="text-lg mb-1">🎉</div>
              <p>You've reached the end of the feed</p>
            </div>
          )}
        </div>
      </div>

      {/* Tag switcher navigation */}
      <div
        id="tagSwitcher"
        className="fixed left-1/2 top-8 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-full z-10 flex px-1 py-1 justify-center items-center shadow-lg"
        style={{ 
          width: '90%', 
          maxWidth: '500px',
          border: '2px solid rgba(80, 105, 219, 0.4)',
          whiteSpace: 'nowrap',
          overflowX: 'auto',
          minWidth: 0
        }}
      >
        <div className="flex flex-nowrap justify-center items-center w-full gap-2" style={{ width: '100%' }}>
          {[
            { id: 'for-you', name: 'for-you', display_name: 'For You' },
            { id: 'trending', name: 'trending', display_name: 'Trending' },
            { id: 'recent', name: 'recent', display_name: 'Recent' },
            { id: 'following', name: 'following', display_name: 'Following', requiresAuth: true }
          ].map(option => {
            const isDisabled = option.requiresAuth && !isAuthenticated;
            const isActive = currentTag === option.name;
            const url = `/tags/${encodeURIComponent(option.name)}`;
            // Hide (Login) for unauthenticated users
            return (
              <a
                key={option.id}
                href={url}
                tabIndex={isDisabled ? -1 : 0}
                className={`tag-option ${option.name} px-3 py-2 text-sm font-semibold cursor-pointer transition-all duration-200 ease-out transform-gpu flex-1 text-center ${
                  isActive 
                    ? 'bg-gradient-to-r from-accent-orange/90 to-neon-pink/90 text-white scale-105 opacity-100 shadow-md' 
                    : isDisabled
                      ? 'text-white/40 cursor-not-allowed opacity-50'
                      : 'text-white/80 hover:text-white hover:bg-white/10 opacity-80 hover:opacity-100 rounded-full'
                } rounded-full focus:outline-none focus:ring-2 focus:ring-neon-blue/50`}
                style={{ whiteSpace: 'nowrap', minWidth: 0 }}
                onClick={e => {
                  e.preventDefault();
                  if (!isDisabled) handleTagOptionClick(option.name);
                }}
              >
                {option.display_name}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}