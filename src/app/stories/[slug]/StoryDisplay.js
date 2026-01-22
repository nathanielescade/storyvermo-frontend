'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const [currentTag, setCurrentTag] = useState(null);
  const searchParams = useSearchParams();
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { handleLikeToggle, handleSaveToggle, handleUserFollow, handleOpenVerses, handleTagSwitch } = useMain();

  const router = useRouter();

  // Extract current tag from query params (set when user clicks a tag to navigate to story)
  useEffect(() => {
    if (!searchParams) return;
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      try {
        const decodedTag = decodeURIComponent(tagParam);
        setCurrentTag(decodedTag);
      } catch (e) {
        setCurrentTag(tagParam);
      }
    } else {
      // No tag param in URL
      setCurrentTag(null);
    }
  }, [searchParams]);

  // Handle tag clicks: navigate to tag page and switch the feed tag (like FeedClient)
  const handleTagSelect = useCallback((tagName) => {
    if (tagName === 'following' && !isAuthenticated) {
      // If not authenticated, open auth modal (consistent with FeedClient)
      try { window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } })); } catch (e) {}
      return;
    }

    try {
      const slug = encodeURIComponent(String(tagName).toLowerCase().replace(/\s+/g,'-'));
      const newUrl = tagName === 'for-you' ? '/' : `/tags/${slug}/`;
      // Use Next.js client navigation so the app renders the page instead of only changing history
      try { router.push(newUrl); } catch (e) { window.history.pushState({}, '', newUrl); }
    } catch (e) {
      // ignore
    }

    try {
      // Dispatch a global tag switch event so the main feed's useMain handles the change.
      try {
        window.dispatchEvent(new CustomEvent('tag:switch', { detail: { tag: tagName } }));
      } catch (e) {
        // Fallback: call local handler if dispatch fails
        try { handleTagSwitch(tagName); } catch (err) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }
  }, [handleTagSwitch, isAuthenticated, router]);

  const wrapperRef = useRef(null);

  // Reusable refetch function so child components can request a story refresh
  const refetchStory = useCallback(async () => {
    try {
      const data = await storiesApi.getStoryBySlug(slug);
      if (data) setStory(data);
    } catch (err) {
      // Keep current story if refetch fails
    }
  }, [slug]);

  // Refetch story client-side ONLY if we need to update like/save state
  // Skip if story already has user interaction data (newer than 5 minutes)
  useEffect(() => {

    if (slug && isAuthenticated) {
      // Debounce refetch to avoid constant updates
      const timer = setTimeout(() => {
        refetchStory();
      }, 300); // 300ms delay for user auth to settle

      return () => clearTimeout(timer);
    }
  }, [slug, isAuthenticated, refetchStory]);

  // Handle verse query param - ensure story data is fresh with verse slugs
  useEffect(() => {
    if (!story) return;

    const verseParam = searchParams?.get ? searchParams.get('verse') : null;
    if (verseParam) {
      // First try to find the verse in the current story
      let idx = (story.verses || []).findIndex(v => 
        String(v.id) === String(verseParam) || 
        String(v.public_id) === String(verseParam) || 
        String(v.slug) === String(verseParam)
      );
      
      // If verse found but doesn't have slug, we should refetch to get complete data
      if (idx >= 0 && !story.verses[idx].slug) {
        // Fetch fresh story data to ensure verses have slug property
        const fetchStoryWithSlug = async () => {
          try {
            const freshStory = await storiesApi.getStoryBySlug(slug);
            if (freshStory && freshStory.verses && freshStory.verses.length > 0) {
              setStory(freshStory);
              // Find verse again in fresh story
              const freshIdx = freshStory.verses.findIndex(v =>
                String(v.id) === String(verseParam) ||
                String(v.public_id) === String(verseParam) ||
                String(v.slug) === String(verseParam)
              );
              setInitialVerseIndex(freshIdx >= 0 ? freshIdx : 0);
            }
          } catch (err) {
          }
        };
        fetchStoryWithSlug();
      }
      
      const indexToOpen = idx >= 0 ? idx : 0;
      setInitialVerseIndex(indexToOpen);
      setShowVerseViewer(true);
    }
  }, [story, searchParams, slug]);

  // Overscroll/stretch effect removed to avoid interfering with modals and native scrolling.

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
    <div className="bg-gradient-to-br from-gray-950 to-slate-900  story-detail">
      <div ref={wrapperRef} className="max-w-4xl mx-auto " style={{ }}>
        <StoryCard 
          story={story}
          currentTag={currentTag}
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
          <VerseViewer
            isOpen={showVerseViewer}
            onClose={() => setShowVerseViewer(false)}
            story={story}
            initialVerseIndex={initialVerseIndex}
            onStoryUpdate={refetchStory}
            isAuthenticated={isAuthenticated}
            openAuthModal={openAuthModal}
          />
        )}
      </div>
    </div>
  );
}