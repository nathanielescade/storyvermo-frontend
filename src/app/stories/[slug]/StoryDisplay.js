'use client';

import { useEffect, useState, useRef } from 'react';
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

  const wrapperRef = useRef(null);
  const overscrollRef = useRef(0);
  const wheelTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);

  // Optional: Add real-time updates or refetch logic here if needed
  useEffect(() => {
    if (!initialStory) {
      // Fetch client-side if no initial data
      storiesApi.getStoryBySlug(slug).then(data => {
        if (data) setStory(data);
        else notFound();
      }).catch(err => {
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

  // Overscroll "stretch" effect handlers (wheel + touch)
  useEffect(() => {
    const MAX = 80; // px max stretch

    const applyTransform = (amount) => {
      if (!wrapperRef.current) return;
      const capped = Math.min(amount, MAX);
      const translate = capped; // move content up when pulling at bottom
      const scale = 1 + Math.min(capped / 1000, 0.06); // small vertical scale
      wrapperRef.current.style.transform = `translateY(${-translate}px) scaleY(${scale})`;
    };

    const resetTransform = () => {
      if (!wrapperRef.current) return;
      wrapperRef.current.style.transition = 'transform 450ms cubic-bezier(.2,.8,.2,1)';
      wrapperRef.current.style.transform = '';
      // clear transition after animation
      window.setTimeout(() => {
        if (wrapperRef.current) wrapperRef.current.style.transition = '';
      }, 500);
      overscrollRef.current = 0;
    };

    let wheelTimer = null;

    const onWheel = (e) => {
      try {
        // Only act on downward scroll attempts
        if (e.deltaY <= 0) return;

        const atBottom = (document.documentElement.scrollTop + window.innerHeight) >= (document.documentElement.scrollHeight - 1);
        if (!atBottom) return;

        // Prevent native scrolling beyond bottom so we can show stretch
        e.preventDefault();

        overscrollRef.current = Math.min(overscrollRef.current + e.deltaY, 300);
        applyTransform(overscrollRef.current);

        // debounce release
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          resetTransform();
        }, 80);
      } catch (err) {
        // swallow any errors to avoid breaking scroll
      }
    };

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      touchStartRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const y = e.touches[0].clientY;
      const startY = touchStartRef.current || y;
      const delta = startY - y; // positive when dragging up
      if (delta <= 0) return;

      const atBottom = (document.documentElement.scrollTop + window.innerHeight) >= (document.documentElement.scrollHeight - 1);
      if (!atBottom) return;

      // Prevent native overscroll
      e.preventDefault();

      overscrollRef.current = Math.min(delta, 300);
      applyTransform(overscrollRef.current);
    };

    const onTouchEnd = () => {
      resetTransform();
    };

    // Use passive:false for wheel/touchmove so preventDefault works
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      clearTimeout(wheelTimer);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, []);

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
      <div ref={wrapperRef} className="max-w-4xl mx-auto " style={{ willChange: 'transform', isolation: 'isolate', zIndex: 'auto' }}>
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