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
      handleTagSwitch(tagName);
    } catch (e) {
      // ignore
    }
  }, [handleTagSwitch, isAuthenticated, router]);

  const wrapperRef = useRef(null);
  const overscrollRef = useRef(0);
  const wheelTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);

  // Refetch story client-side ONLY if we need to update like/save state
  // Skip if story already has user interaction data (newer than 5 minutes)
  useEffect(() => {
    let mounted = true;

    const refetchStory = async () => {
      try {
        const data = await storiesApi.getStoryBySlug(slug);
        if (mounted && data) {
          setStory(data);
        }
      } catch (err) {
        // Keep current story if refetch fails
      }
    };

    // Only refetch if we have a slug and user just authenticated/changed
    // Skip refetch if story is brand new (server just rendered it)
    if (slug && isAuthenticated) {
      // Debounce refetch to avoid constant updates
      const timer = setTimeout(() => {
        refetchStory();
      }, 300); // 300ms delay for user auth to settle
      
      return () => clearTimeout(timer);
    }
  }, [slug, isAuthenticated]);

  // Handle verse query param
  useEffect(() => {
    if (!story) return;

    const verseParam = searchParams?.get ? searchParams.get('verse') : null;
    if (verseParam) {
      // Find index of verse by id/public_id/slug
      const idx = (story.verses || []).findIndex(v => 
        String(v.id) === String(verseParam) || 
        String(v.public_id) === String(verseParam) || 
        String(v.slug) === String(verseParam)
      );
      const indexToOpen = idx >= 0 ? idx : 0;
      setInitialVerseIndex(indexToOpen);
      setShowVerseViewer(true);
    }
  }, [story, searchParams]);

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
          <VerseViewer isOpen={showVerseViewer} onClose={() => setShowVerseViewer(false)} story={story} initialVerseIndex={initialVerseIndex} />
        )}
      </div>
    </div>
  );
}