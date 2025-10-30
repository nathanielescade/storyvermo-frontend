'use client';

import { useEffect, useRef } from 'react';
import StoryCard from './components/StoryCard';
import useMain from '../../hooks/useMain';
import { useAuth } from '../../contexts/AuthContext';

// Home.js
// ... existing imports ...

export default function Home() {
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
    handleOpenStoryVerses
  } = useMain()
  
  const { currentUser, isAuthenticated, refreshAuth } = useAuth();
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
  
  // When other parts of the app (GlobalShell) perform authentication and
  // dispatch an auth:success event, handle any pending actions that require
  // access to page-level functionality (like liking, saving, following).
  useEffect(() => {
    const handler = async (e) => {
      const pendingAction = e?.detail || null;
      try {
        // Refresh auth state so currentUser/isAuthenticated update immediately
        await refreshAuth();
      } catch (err) {
        console.warn('refreshAuth failed', err);
      }

      if (!pendingAction) return;

      switch (pendingAction.type) {
        case 'like':
          await handleLikeToggle(pendingAction.data);
          break;
        case 'save':
          await handleSaveToggle(pendingAction.data);
          break;
        case 'follow':
          await handleFollowUser(pendingAction.data);
          break;
        case 'contribute':
          console.log('Contribute', pendingAction.data?.slug, pendingAction.data?.id);
          break;
        case 'recommend':
          console.log('Recommend', pendingAction.data?.id, pendingAction.data?.slug);
          break;
        case 'discover':
          window.location.href = '/discover';
          break;
        case 'profile':
          if (currentUser) window.location.href = `/${currentUser.username}`;
          break;
        default:
          break;
      }
    };

    window.addEventListener('auth:success', handler);
    return () => window.removeEventListener('auth:success', handler);
  }, [handleLikeToggle, handleSaveToggle, handleFollowUser, refreshAuth, currentUser]);
  
  // Log authentication state for debugging
  useEffect(() => {
    console.log('Authentication state:', { isAuthenticated, currentUser });
  }, [isAuthenticated, currentUser]);
  
  // Handle tag option click with authentication check
  const handleTagOptionClick = async (tagName) => {
    // For following tag, check if user is authenticated
    if (tagName === 'following' && !isAuthenticated) {
      // Request the global auth modal to open with a pending action
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } }));
      return;
    }
    
    // If "for-you" is already active, scroll to top and refresh
    // If the clicked tag is already active, scroll to top and force a refresh
    if (currentTag === tagName) {
      console.log('Refreshing active tag content:', tagName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Force re-fetch of the first page even if tag is already selected
      handleTagSwitch(tagName, { force: true });
      return;
    }
    
    // Push an SEO-friendly URL without reloading the page, then switch tag client-side
    try {
      const slug = encodeURIComponent(String(tagName).toLowerCase().replace(/\s+/g,'-'));
      const newUrl = tagName === 'for-you' ? '/' : `/tags/${slug}/`;
      // Update the URL only (no reload)
      window.history.pushState({}, '', newUrl);
    } catch (e) {
      // fallback: do nothing with history
      console.warn('Failed to update history state for tag URL', e);
    }

    console.log('Changing to tag:', tagName);
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
      // Scroll to top and switch tag (force if requested)
      window.scrollTo({ top: 0, behavior: 'smooth' });
      handleTagSwitch(tag, { force });
    };

    window.addEventListener('tag:switch', onTagSwitchEvent);
    return () => window.removeEventListener('tag:switch', onTagSwitchEvent);
  }, [handleTagSwitch, isAuthenticated]);
  
  return (
    <div className="min-h-screen">
      
      {/* Verses Header (only visible in verses dimension) */}
      <div className={`verses-header ${currentDimension !== 'verses_page' ? 'hidden' : ''}`} id="versesHeader">
        <div className="verses-title">StoryVermo</div>
        <div className="verses-filter">
          <div className="verses-filter-btn active" data-filter="all">All</div>
          <div className="verses-filter-btn" data-filter="recent">Recent</div>
          <div className="verses-filter-btn" data-filter="popular">Popular</div>
        </div>
      </div>
      
      {/* Image Feed Container */}
      <div 
        ref={feedRef}
        className={`image-feed ${currentDimension === 'verses_page' ? 'hidden' : ''}`} 
        id="imageFeed"
        style={{ height: '100vh', overflowY: 'auto', paddingTop: '80px' }} // Added padding to account for fixed header
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
                  // dispatch a global event to open auth modal when needed
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

      {/* Verses Grid Container */}
      <div className={`verses-grid ${currentDimension !== 'verses_page' ? 'hidden' : ''}`} id="versesGrid">
        {/* Verse cards will be dynamically added here */}
      </div>
      
      {/* Tag Switcher - Updated to match ContentDiscoverySwitcher design */}
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
                  ? 'bg-gradient-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100' 
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
      
      {/* Global header/navigation and modals are provided by GlobalShell (in layout) */}
    </div>
  );
}