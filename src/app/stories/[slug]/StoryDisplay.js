// app/stories/[slug]/StoryDisplay.js
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import VerseViewer from '../../components/VerseViewer';
import StoryCard from '../../components/StoryCard';
import { storiesApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import useMain from '../../../../hooks/useMain';
import { notFound } from 'next/navigation';

export default function StoryDisplay({ initialStory, slug }) {
  const [story, setStory] = useState(initialStory);
  const [showVerseViewer, setShowVerseViewer] = useState(false);
  const [initialVerseIndex, setInitialVerseIndex] = useState(0);
  const searchParams = useSearchParams();
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
    // If we have a verse query param, open the verse viewer and scroll to that verse
    const verseParam = searchParams?.get ? searchParams.get('verse') : null;
    if (verseParam && story) {
      // Find index of verse by id/public_id/slug
      const idx = (story.verses || []).findIndex(v => String(v.id) === String(verseParam) || String(v.public_id) === String(verseParam) || String(v.slug) === String(verseParam));
      const indexToOpen = idx >= 0 ? idx : 0;
      setInitialVerseIndex(indexToOpen);
      setShowVerseViewer(true);
    }
  }, [initialStory, slug, searchParams, story]);

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
    <div className="bg-gradient-to-br from-gray-950 to-slate-900 py-12 story-detail">
      <div className="max-w-4xl mx-auto px-4">
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
        {/* If a verse param requested opening, render the VerseViewer modal here */}
        {showVerseViewer && story && (
          <VerseViewer isOpen={showVerseViewer} onClose={() => setShowVerseViewer(false)} story={story} initialVerseIndex={initialVerseIndex} />
        )}
      </div>
    </div>
  );
}