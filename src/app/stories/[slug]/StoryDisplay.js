// app/stories/[slug]/StoryDisplay.js
'use client';

import { useEffect, useState } from 'react';
import StoryCard from '../../components/StoryCard';
import { storiesApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import useMain from '../../../../hooks/useMain';
import { notFound } from 'next/navigation';

export default function StoryDisplay({ initialStory, slug }) {
  const [story, setStory] = useState(initialStory);
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { handleLikeToggle, handleSaveToggle, handleUserFollow, handleOpenVerses, handleTagSelect } = useMain();

  // Optional: Add real-time updates or refetch logic here if needed
  useEffect(() => {
    if (!initialStory) {
      // Fetch client-side if no initial data
      storiesApi.getStoryBySlug(slug).then(data => {
        if (data) setStory(data);
        else notFound();
      }).catch(err => {
        console.error('Error fetching story:', err);
        notFound();
      });
    }
  }, [initialStory, slug]);

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-screen">
            <div className="text-white text-xl">Story not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900">
      <div className="max-w-4xl mx-auto">
        <StoryCard 
          story={story} 
          onLikeToggle={handleLikeToggle}
          onSaveToggle={handleSaveToggle}
          onFollowUser={handleUserFollow}
          onOpenStoryVerses={handleOpenVerses}
          onTagSelect={handleTagSelect}
          isAuthenticated={isAuthenticated}
          openAuthModal={openAuthModal}
        />
      </div>
    </div>
  );
}