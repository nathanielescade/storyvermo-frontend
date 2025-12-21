// FeedClient.js - Static UI without backend logic
'use client';


import React, { useState, useEffect } from 'react';
import StoryCard from './components/StoryCard';
import StoryCardSkeleton from './components/StoryCardSkeleton';
import { storiesApi } from '../../lib/api';

export default function FeedClient() {

  const [currentTag, setCurrentTag] = useState('for-you');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // You can pass params for pagination, filtering, etc. For now, just fetch default feed
    storiesApi.getPaginatedStories({ tag: currentTag !== 'for-you' ? currentTag : undefined })
      .then((data) => {
        // If your API returns { results: [...] }, adjust accordingly
        setStories(data.results || data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load stories.');
        setLoading(false);
      });
  }, [currentTag]);

  const handleTagOptionClick = (tagName) => {
    setCurrentTag(tagName);
  };

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
              isAuthenticated={false}
              openAuthModal={() => {}}
            />
          </div>
        ))}

        {/* Sentinel element for future infinite scroll */}
        <div 
          style={{ height: '2px', width: '100%' }} 
          aria-hidden="true"
          className="my-8"
        />
      </div>

      {/* Tag switcher navigation */}
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
          const isDisabled = option.requiresAuth;
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