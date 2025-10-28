// app/stories/[slug]/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StoryCard from '../../components/StoryCard';
import { storiesApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import useMain from '../../../../hooks/useMain';
import { notFound } from 'next/navigation';

// StoryPage component
export default function StoryPage({ params }) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { handleLikeToggle, handleSaveToggle, handleUserFollow, handleOpenVerses, handleTagSelect } = useMain();

  useEffect(() => {
    // Extract slug from params after awaiting it
    async function fetchStory() {
      try {
        setLoading(true);
        const { slug } = await params;
        if (slug) {
          const data = await storiesApi.getStoryBySlug(slug);
          try {
            console.debug('[StoryPage] fetched story payload', { slug, hasData: !!data, keys: data ? Object.keys(data) : null });
            // Log verses structure for debugging moments
            if (Array.isArray(data?.verses)) {
              console.debug('[StoryPage] verses sample', data.verses.slice(0,5));
            } else {
              console.debug('[StoryPage] verses field', data?.verses);
            }
          } catch (e) {
            console.warn('[StoryPage] failed logging story payload', e);
          }
          if (!data) {
            notFound();
          }
          setStory(data);
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }
    
    fetchStory();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

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

  // Render story using StoryCard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 ">
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