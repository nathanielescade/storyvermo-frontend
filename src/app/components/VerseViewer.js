// components/verseviewer/VerseViewer.jsx
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { absoluteUrl, versesApi, userApi } from '../../../lib/api';
import ContributeModal from './storycard/ContributeModal';
import { useRouter } from 'next/navigation';
import ShareModal from './ShareModal';
import { createPortal } from 'react-dom';

// Import modular components
import VerseHeader from './verseviewer/VerseHeader';
import MomentsCarousel from './verseviewer/MomentCarousel';
import VerseContent from './verseviewer/VerseContent';
import VerseFooter from './verseviewer/VerseFooter';
import { 
  getMomentImageUrl, 
  getAuthorDisplayName, 
  getAuthorProfileImageUrl, 
  getAuthorInitial, 
  getAuthorUsername, 
  getUserId 
} from './verseviewer/utils';

// Match ContributeModal theme exactly
const defaultTheme = {
  gradient: 'from-gray-950 via-slate-950 to-indigo-950',
  particles: ['bg-cyan-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-amber-300'],
  text: 'from-cyan-400 via-blue-500 to-purple-500',
  accent: 'cyan-400',
  border: 'border border-cyan-500/40',
  glass: 'bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md',
  shadow: 'shadow-2xl shadow-cyan-900/30',
};

const VerseViewer = ({ 
  isOpen, 
  onClose, 
  story, 
  initialVerseIndex = 0,
  onReady,
  isAuthenticated,
  openAuthModal,
  onStoryUpdate,
  onOpenStoryForm,
}) => {
  // State management
  const [fontSize, setFontSize] = useState(32);
  const { currentUser } = useAuth();
  const router = useRouter();
  const [showVerseOptions, setShowVerseOptions] = useState(false);
  const [editingVerse, setEditingVerse] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(() => {
    return story?.isFollowing || story?.is_following || false;
  });
  
  const verseOptionsRef = useRef(null);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(initialVerseIndex);
  const verseMetadataRef = useRef({});
  const storyRef = useRef(story);
  
  // Update story ref when story prop changes
  useEffect(() => {
    if (story && story.verses) {
      const mergedVerses = story.verses.map(verse => {
        const cachedMetadata = verseMetadataRef.current[verse.id];
        if (cachedMetadata) {
          return {
            ...verse,
            ...cachedMetadata,
            user_has_liked: cachedMetadata.is_liked_by_user,
            user_has_saved: cachedMetadata.is_saved_by_user
          };
        }
        return verse;
      });
      
      storyRef.current = {
        ...story,
        verses: mergedVerses
      };
    } else {
      storyRef.current = story;
    }
  }, [story]);

  const currentVerse = useMemo(() => {
    if (!storyRef.current?.verses || currentVerseIndex >= storyRef.current.verses.length) {
      return null;
    }
    return storyRef.current.verses[currentVerseIndex];
  }, [currentVerseIndex, storyRef.current?.verses]);

  const getVerseInitialState = (verse) => {
    if (!verse) return { isLiked: false, isSaved: false, likeCount: 0, saveCount: 0 };
    
    const isLikedStatus = verse.user_has_liked || verse.is_liked_by_user || false;
    const isSavedStatus = verse.user_has_saved || verse.is_saved_by_user || false;
    const likeCountVal = verse.likes_count || 0;
    const saveCountVal = verse.saves_count || 0;
    
    return { isLiked: isLikedStatus, isSaved: isSavedStatus, likeCount: likeCountVal, saveCount: saveCountVal };
  };
  
  const initial = getVerseInitialState(currentVerse);
  const [isLiked, setIsLiked] = useState(initial.isLiked);
  const [isSaved, setIsSaved] = useState(initial.isSaved);
  const [likeCount, setLikeCount] = useState(initial.likeCount);
  const [saveCount, setSaveCount] = useState(initial.saveCount);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [pullDownProgress, setPullDownProgress] = useState(0);
  
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  
  const verseRefs = useRef([]);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const verseBlockRefs = useRef([]);
  const userScrolledRef = useRef(false);
  
  const hasMoments = currentVerse?.moments && currentVerse.moments.length > 0;
  const hasMultipleMoments = hasMoments && currentVerse.moments.length > 1;
  
  const isContribution = (() => {
    if (!currentVerse || !story || !currentVerse.author) {
      return false;
    }
    
    const authorId = getUserId(currentVerse.author);
    const creatorId = getUserId(story.creator);
    
    if (!authorId || !creatorId) {
      return false;
    }
    
    return String(authorId) !== String(creatorId);
  })();

  // Effect for handling click outside verse options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (verseOptionsRef.current && !verseOptionsRef.current.contains(event.target)) {
        setShowVerseOptions(false);
      }
    };

    if (showVerseOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVerseOptions]);
  
  // Effect for updating state when current verse changes
  useEffect(() => {
    if (currentVerse) {
      const initial = getVerseInitialState(currentVerse);
      setIsLiked(initial.isLiked);
      setIsSaved(initial.isSaved);
      setLikeCount(initial.likeCount);
      setSaveCount(initial.saveCount);
      setCurrentMomentIndex(0);
      setIsContentExpanded(false);
      setIsTextVisible(true);
    }
  }, [currentVerse?.id]);
  
  // Effect for syncing state when story data is updated
  useEffect(() => {
    if (currentVerse && storyRef.current?.verses) {
      const latestVerse = storyRef.current.verses.find(v => v.id === currentVerse.id);
      if (latestVerse) {
        const initial = getVerseInitialState(latestVerse);
        setIsLiked(initial.isLiked);
        setIsSaved(initial.isSaved);
        setLikeCount(initial.likeCount);
        setSaveCount(initial.saveCount);
      }
    }
  }, [storyRef.current?.verses, currentVerse?.id]);

  // Effect for scroll hint
  useEffect(() => {
    if (!isOpen || !story?.verses || story.verses.length <= 1) {
      setShowScrollHint(false);
      return;
    }

    if (currentVerseIndex >= story.verses.length - 1) {
      setShowScrollHint(false);
      return;
    }

    const showTimer = setTimeout(() => {
      setShowScrollHint(true);
    }, 1000);

    const hideTimer = setTimeout(() => {
      setShowScrollHint(false);
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isOpen, story?.verses, currentVerseIndex]);

  // Effect for hiding scroll hint when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      userScrolledRef.current = true;
      setShowScrollHint(false);
    };

    const containerElement = containerRef.current;
    if (containerElement && isOpen) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => {
        containerElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen]);

  // Effect for auto-nudge scroll
  useEffect(() => {
    if (!isOpen) return;
    const verses = storyRef.current?.verses || story?.verses || [];
    if (!Array.isArray(verses) || verses.length <= 1) return;
    if (currentVerseIndex >= verses.length - 1) return;

    const el = containerRef.current;
    if (!el) return;

    userScrolledRef.current = false;

    const nudgeTimeout = setTimeout(() => {
      if (userScrolledRef.current) return;

      const nudge = Math.min(60, Math.round(el.clientHeight * 0.06));

      const prevSnap = el.style.scrollSnapType || '';
      try { el.style.scrollSnapType = 'none'; } catch (e) {}

      const onUserScrollDuring = () => {
        userScrolledRef.current = true;
      };
      el.addEventListener('scroll', onUserScrollDuring, { passive: true });

      try {
        el.scrollBy({ top: nudge, behavior: 'smooth' });
      } catch (e) {
        el.scrollTop = Math.min(el.scrollHeight, el.scrollTop + nudge);
      }

      const backDelay = 1200;
      const returnTimer = setTimeout(() => {
        if (!userScrolledRef.current) {
          try {
            el.scrollBy({ top: -nudge, behavior: 'smooth' });
          } catch (e) {
            el.scrollTop = Math.max(0, el.scrollTop - nudge);
          }
        }
        try { el.style.scrollSnapType = prevSnap; } catch (e) {}
        try { el.removeEventListener('scroll', onUserScrollDuring); } catch (e) {}
      }, backDelay);

      const restoreTimer = setTimeout(() => {
        try { el.style.scrollSnapType = prevSnap; } catch (e) {}
        try { el.removeEventListener('scroll', onUserScrollDuring); } catch (e) {}
      }, backDelay + 600);

      const clearAll = () => {
        try { clearTimeout(returnTimer); } catch (e) {}
        try { clearTimeout(restoreTimer); } catch (e) {}
        try { el.removeEventListener('scroll', onUserScrollDuring); } catch (e) {}
        try { el.style.scrollSnapType = prevSnap; } catch (e) {}
      };

      el.__nudgeClear = clearAll;

    }, 2000);

    return () => {
      try { clearTimeout(nudgeTimeout); } catch (e) {}
      try { if (containerRef.current && typeof containerRef.current.__nudgeClear === 'function') containerRef.current.__nudgeClear(); } catch (e) {}
      userScrolledRef.current = false;
    };
  }, [isOpen, currentVerseIndex, story]);

  // Navigation helpers
  const scrollToVerseIndex = (targetIndex) => {
    if (!verseBlockRefs.current || !verseBlockRefs.current.length) return;
    const idx = Math.max(0, Math.min(targetIndex, verseBlockRefs.current.length - 1));
    const el = verseBlockRefs.current[idx];
    if (el && el.scrollIntoView) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.scrollTop = el.offsetTop;
        }
      }
    }
  };

  const scrollToNextVerse = () => scrollToVerseIndex(currentVerseIndex + 1);
  const scrollToPrevVerse = () => scrollToVerseIndex(currentVerseIndex - 1);

  // Effect for resetting state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentVerseIndex(initialVerseIndex);
      setIsContentExpanded(false);
      setFocusMode(false);
      setIsTextVisible(true);
      
      if (story?.verses && story.verses.length > 0) {
        const initialVerse = story.verses[initialVerseIndex] || story.verses[0];
        if (initialVerse) {
          const initial = getVerseInitialState(initialVerse);
          setIsLiked(initial.isLiked);
          setLikeCount(initial.likeCount);
          setIsSaved(initial.isSaved);
          setSaveCount(initial.saveCount);
        }
      }
    }
    
    return () => {
      // cleanup
    };
  }, [isOpen, initialVerseIndex, story?.id, story?.verses?.length]);

  // Effect for auto-scrolling to initial verse
  useEffect(() => {
    if (isOpen && initialVerseIndex > 0 && verseBlockRefs.current && verseBlockRefs.current.length > 0) {
      const timer = setTimeout(() => {
        scrollToVerseIndex(initialVerseIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialVerseIndex]);

  // Effect for notifying parent when viewer is ready
  useEffect(() => {
    if (isOpen && typeof onReady === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { onReady(); } catch (e) { /* ignore */ }
      }));
    }
  }, [isOpen, onReady]);

  // Effect for updating browser URL
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!isOpen) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('verse')) {
          url.searchParams.delete('verse');
          window.history.replaceState({}, '', url.toString());
        }
        return;
      }

      if (!currentVerse) return;
      const verseId = currentVerse.id ?? currentVerse.public_id ?? currentVerse.slug ?? null;
      if (!verseId) return;
      const url = new URL(window.location.href);
      url.searchParams.set('verse', String(verseId));
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // ignore history exceptions
    }
  }, [isOpen, currentVerseIndex, currentVerse]);

  // Effect for intersection observer
  useEffect(() => {
    if (!containerRef.current || !verseBlockRefs.current.length) return;

    const observerOptions = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.5
    };

    const observerCallback = (entries) => {
      let mostVisibleVerse = null;
      let maxIntersectionRatio = 0;

      entries.forEach((entry) => {
        if (entry.intersectionRatio > maxIntersectionRatio) {
          maxIntersectionRatio = entry.intersectionRatio;
          mostVisibleVerse = entry.target;
        }
      });

      if (mostVisibleVerse && maxIntersectionRatio > 0.5) {
        const newIndex = verseBlockRefs.current.indexOf(mostVisibleVerse);
        if (newIndex >= 0 && newIndex !== currentVerseIndex) {
          setCurrentVerseIndex(newIndex);
          setCurrentMomentIndex(0);
          
          const newVerse = storyRef.current?.verses?.[newIndex];
          if (newVerse) {
            const cachedMetadata = verseMetadataRef.current[newVerse.id];
            
            if (cachedMetadata) {
              setIsLiked(cachedMetadata.is_liked_by_user);
              setIsSaved(cachedMetadata.is_saved_by_user);
              setLikeCount(cachedMetadata.likes_count);
              setSaveCount(cachedMetadata.saves_count);
            } else {
              setIsLiked(newVerse.user_has_liked || newVerse.is_liked_by_user || false);
              setIsSaved(newVerse.user_has_saved || newVerse.is_saved_by_user || false);
              setLikeCount(newVerse.likes_count || 0);
              setSaveCount(newVerse.saves_count || 0);
              
              verseMetadataRef.current[newVerse.id] = {
                is_liked_by_user: newVerse.user_has_liked || newVerse.is_liked_by_user || false,
                is_saved_by_user: newVerse.user_has_saved || newVerse.is_saved_by_user || false,
                likes_count: newVerse.likes_count || 0,
                saves_count: newVerse.saves_count || 0
              };
            }
          }
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    verseBlockRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [currentVerseIndex, storyRef.current?.verses]);

  // Action handlers
  const handleLike = async () => {
    if (!currentVerse) return;
    
    let verseSlug = currentVerse.slug;
    if (!verseSlug && currentVerse.id) {
      const verseInStory = storyRef.current?.verses?.find(v => v.id === currentVerse.id);
      verseSlug = verseInStory?.slug;
    }
    
    if (!verseSlug) {
      console.warn('Cannot like verse: missing slug', currentVerse);
      return;
    }
    
    if (!isAuthenticated) {
      if (typeof openAuthModal === 'function') openAuthModal('like', { slug: story.slug, verseId: currentVerse.id });
      return;
    }

    if (isLikeLoading) return;

    const wasLiked = isLiked;
    const prevLikeCount = likeCount;

    try {
      setIsLikeLoading(true);
      
      setIsLiked(!wasLiked);
      setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

      const response = await versesApi.toggleLikeBySlug(verseSlug);

      setIsLiked(response.is_liked_by_user || response.user_has_liked || !wasLiked);
      setLikeCount(response.likes_count || likeCount);

      if (storyRef.current?.verses) {
        const updatedVerses = storyRef.current.verses.map(v =>
          v.id === currentVerse.id
            ? {
                ...v,
                is_liked_by_user: response.is_liked_by_user || response.user_has_liked,
                user_has_liked: response.is_liked_by_user || response.user_has_liked,
                likes_count: response.likes_count
              }
            : v
        );

        const updatedStory = { ...storyRef.current, verses: updatedVerses };
        storyRef.current = updatedStory;

        if (typeof onStoryUpdate === 'function') {
          onStoryUpdate(updatedStory);
        }
      }
    } catch (error) {
      console.error('Error toggling verse like:', error);
      setIsLiked(wasLiked);
      setLikeCount(prevLikeCount);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentVerse) return;
    
    let verseSlug = currentVerse.slug;
    if (!verseSlug && currentVerse.id) {
      const verseInStory = storyRef.current?.verses?.find(v => v.id === currentVerse.id);
      verseSlug = verseInStory?.slug;
    }
    
    if (!verseSlug) {
      console.warn('Cannot save verse: missing slug', currentVerse);
      return;
    }
    
    if (!isAuthenticated) {
      if (typeof openAuthModal === 'function') openAuthModal('save', { slug: story.slug, verseId: currentVerse.id });
      return;
    }

    if (isSaveLoading) return;

    const wasSaved = isSaved;
    const prevSaveCount = saveCount;

    try {
      setIsSaveLoading(true);
      
      setIsSaved(!wasSaved);
      setSaveCount(prev => wasSaved ? prev - 1 : prev + 1);

      const response = await versesApi.toggleSaveBySlug(verseSlug);

      setIsSaved(response.is_saved_by_user || response.user_has_saved || !wasSaved);
      setSaveCount(response.saves_count || saveCount);

      if (storyRef.current?.verses) {
        const updatedVerses = storyRef.current.verses.map(v =>
          v.id === currentVerse.id
            ? {
                ...v,
                is_saved_by_user: response.is_saved_by_user || response.user_has_saved,
                user_has_saved: response.is_saved_by_user || response.user_has_saved,
                saves_count: response.saves_count
              }
            : v
        );

        const updatedStory = { ...storyRef.current, verses: updatedVerses };
        storyRef.current = updatedStory;

        if (typeof onStoryUpdate === 'function') {
          onStoryUpdate(updatedStory);
        }
      }
    } catch (error) {
      console.error('Error toggling verse save:', error);
      setIsSaved(wasSaved);
      setSaveCount(prevSaveCount);
    } finally {
      setIsSaveLoading(false);
    }
  };

  const handleShare = () => {
    if (!currentVerse || !story) return;

    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const verseId = currentVerse?.id || currentVerse?.public_id || currentVerse?.slug || '';
    const encodedSlug = story && story.slug ? encodeURIComponent(story.slug) : '';
    const encodedVerseId = typeof verseId === 'string' || typeof verseId === 'number' ? encodeURIComponent(verseId) : '';
    const verseUrl = origin
      ? `${origin}/stories/${encodedSlug}/?verse=${encodedVerseId}`
      : `/stories/${encodedSlug}/?verse=${encodedVerseId}`;

    const payload = {
      title: `${story.title || 'StoryVermo'} - Verse ${currentVerseIndex + 1}`,
      description: (currentVerse.content || '').slice(0, 240),
      url: verseUrl
    };

    const imageForShare = (currentVerse && currentVerse.moments && currentVerse.moments[currentMomentIndex]) ? getMomentImageUrl(currentVerse.moments[currentMomentIndex]) : getMomentImageUrl(story?.verses && story.verses[0]?.moments && story.verses[0].moments[0]);

    setShareData(payload);
    setShareImage(imageForShare || null);
    setShowShareModal(true);
  };

  const handleOpenContribute = () => {
    if (!isAuthenticated) {
      if (typeof openAuthModal === 'function') openAuthModal('contribute', { slug: story.slug, id: story.id });
      return;
    }
    setShowContributeModal(true);
  };

  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  const hasMoreLines = (content) => {
    if (!content) return false;
    
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.width = '300px';
    tempElement.style.whiteSpace = 'pre-wrap';
    tempElement.style.wordWrap = 'break-word';
    tempElement.textContent = content;
    
    document.body.appendChild(tempElement);
    const lineHeight = parseInt(window.getComputedStyle(tempElement).lineHeight);
    const height = tempElement.offsetHeight;
    document.body.removeChild(tempElement);
    
    return height > lineHeight * 3;
  };

  const renderColorfulBubbles = () => {
    const particles = [];
    
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 12 + 4;
      const left = `${Math.random() * 100}%`;
      const top = `${Math.random() * 100}%`;
      const opacity = Math.random() * 0.6 + 0.2;
      const animationDuration = `${Math.random() * 25 + 15}s`;
      const animationDelay = `${Math.random() * 5}s`;
      const colorClass = defaultTheme.particles[Math.floor(Math.random() * defaultTheme.particles.length)];
      
      particles.push(
        <div
          key={`bubble-${i}`}
          className={`absolute rounded-full ${colorClass} opacity-80`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left,
            top,
            opacity,
            animation: `float ${animationDuration} infinite ease-in-out`,
            animationDelay,
            boxShadow: `0 0 ${size/2}px ${colorClass.replace('bg-', '')}`
          }}
        />
      );
    }
    
    return particles;
  };

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareImage, setShareImage] = useState(null);

  if (!isOpen || !story) return null;

  const viewer = (
    <div className={`fixed inset-0 z-[10100] bg-gradient-to-br ${defaultTheme.gradient} ${defaultTheme.shadow} transition-all duration-1000 rounded-3xl border ${defaultTheme.border}`} style={{overflow: 'hidden'}}>
      {/* Glassy border and subtle vignette */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
        <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
      </div>

      {/* Colorful bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {renderColorfulBubbles()}
      </div>

      {/* Reading progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-2 z-[9999] bg-black/30 pointer-events-none rounded-b-2xl">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 transition-all duration-300 ease-out rounded-b-2xl shadow-lg shadow-cyan-400/20"
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>

      {/* Scroll hint */}
      {showScrollHint && story?.verses && story.verses.length > 1 && (
        <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="animate-bounce">
            <i className="fas fa-chevron-down text-4xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse drop-shadow-lg"></i>
          </div>
        </div>
      )}

      {/* Header */}
      <VerseHeader 
        story={story}
        currentVerseIndex={currentVerseIndex}
        onClose={onClose}
        focusMode={focusMode}
        hasMoments={hasMoments}
        currentMomentIndex={currentMomentIndex}
        currentVerse={currentVerse}
      />

      {/* Left-side navigation arrows */}
      <div className="absolute left-3 z-50 flex flex-col gap-2 pointer-events-auto" style={{ top: 'calc(50% + 48px)' }}>
        <button
          aria-label="Previous verse"
          onClick={(e) => { e.stopPropagation(); scrollToPrevVerse(); }}
          disabled={currentVerseIndex <= 0}
          className={`w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center shadow-lg border border-white/10 transition-opacity ${currentVerseIndex <= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <i className="fas fa-chevron-up"></i>
        </button>
        <button
          aria-label="Next verse"
          onClick={(e) => { e.stopPropagation(); scrollToNextVerse(); }}
          disabled={story?.verses ? currentVerseIndex >= story.verses.length - 1 : true}
          className={`w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center shadow-lg border border-white/10 transition-opacity ${story?.verses && currentVerseIndex >= story.verses.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <i className="fas fa-chevron-down"></i>
        </button>
      </div>

      {/* Vertical scroll container for verses */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll scrollbar-hide scroll-smooth"
        style={{ 
          scrollBehavior: 'smooth',
          scrollSnapType: 'y mandatory',
          height: '100vh',
          overflow: 'auto',
          overscrollBehavior: 'none',
        }}
      >
        <div ref={contentRef} className="flex flex-col" style={{ height: '100%' }}>
          {story.verses.map((verse, verseIndex) => (
            <div 
              key={`verse-${verse.id}-${verseIndex}`}
              ref={el => {
                verseRefs.current[verseIndex] = el;
                verseBlockRefs.current[verseIndex] = el;
              }}
              className="w-full flex flex-col relative overflow-hidden"
              style={{
                height: '100vh',
                minHeight: '100vh',
                maxHeight: '100vh',
                flex: '0 0 100vh',
                scrollSnapAlign: 'center',
                scrollSnapStop: 'always',
                willChange: 'transform',
              }}
            >
              {/* Pull-down hint */}
              {verseIndex === 0 && story.verses.length > 1 && (
                <div 
                  className="absolute top-0 left-0 right-0 z-40 flex justify-center pt-8 pointer-events-none"
                  style={{
                    opacity: Math.max(0, pullDownProgress * 2),
                    transform: `translateY(${Math.min(pullDownProgress * 40, 30)}px)`,
                    transition: pullDownProgress === 0 ? 'all 0.3s ease-out' : 'none'
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl text-cyan-400 animate-bounce" style={{ animationDelay: '0s', opacity: Math.max(0, pullDownProgress * 2) }}>↓</div>
                    <span className="text-cyan-300 text-sm font-medium whitespace-nowrap">Scroll for more verses</span>
                  </div>
                </div>
              )}
              
              {/* Moments or content */}
              {verse.moments && verse.moments.length > 0 ? (
                <MomentsCarousel 
                  moments={verse.moments}
                  currentMomentIndex={currentMomentIndex}
                  setCurrentMomentIndex={setCurrentMomentIndex}
                  toggleFocusMode={toggleFocusMode}
                  focusMode={focusMode}
                />
              ) : (
                <VerseContent 
                  content={verse.content}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  toggleFocusMode={toggleFocusMode}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed Content Area with glassmorphism */}
      {!focusMode && isTextVisible && hasMoments && (
        <div className="fixed bottom-20 left-0 right-0 z-40 bg-gradient-to-t from-black/60 backdrop-blur-lg to-transparent p-6">
          <div className="max-w-3xl mx-auto">
            {currentVerse?.content && (
              <div className="text-white">
                <div 
                  className={`overflow-hidden transition-all duration-500 ${isContentExpanded ? 'max-h-96' : 'max-h-16'}`}
                >
                  <span className={`bg-gradient-to-r ${defaultTheme.text} bg-clip-text text-transparent text-xl`}>
                    {currentVerse.content}
                  </span>
                </div>
                
                {hasMoreLines(currentVerse.content) && (
                  <button 
                    className="text-cyan-400 mt-3 text-sm flex items-center gap-1"
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                  >
                    {isContentExpanded ? (
                      <>
                        <i className="fas fa-chevron-up text-xs"></i> Show Less
                      </>
                    ) : (
                      <>
                        <i className="fas fa-chevron-down text-xs"></i> Read More
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <VerseFooter 
        story={story}
        currentVerse={currentVerse}
        isLiked={isLiked}
        isSaved={isSaved}
        likeCount={likeCount}
        saveCount={saveCount}
        isLikeLoading={isLikeLoading}
        isSaveLoading={isSaveLoading}
        handleLike={handleLike}
        handleSave={handleSave}
        handleShare={handleShare}
        handleOpenContribute={handleOpenContribute}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        openAuthModal={openAuthModal}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        focusMode={focusMode}
        showVerseOptions={showVerseOptions}
        setShowVerseOptions={setShowVerseOptions}
        isContribution={isContribution}
      />

      {/* Focus Mode Indicator */}
      {focusMode && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
          <div className="bg-black/50 backdrop-blur-lg rounded-full px-4 py-2 text-white text-sm flex items-center gap-2">
            <i className="fas fa-eye"></i> Focus Mode Active
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      <ContributeModal 
        showContributeModal={showContributeModal}
        setShowContributeModal={setShowContributeModal}
        story={story}
        onStoryUpdated={async () => {
          if (story && story.slug) {
            try {
              const updatedStory = await versesApi.getVersesByStorySlug(story.slug);
            } catch (error) {
              console.error('Error refreshing story data:', error);
            }
          }
        }}
      />
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareData={shareData || {}}
        imageUrl={shareImage}
        isVerse={true}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[700] flex items-center justify-center">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-red-500/30 shadow-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 mx-auto mb-4 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Verse</h3>
              <p className="text-gray-300">Are you sure you want to delete this verse? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await versesApi.deleteVerse(currentVerse.slug);
                    setShowDeleteModal(false);
                    onClose();
                    if (typeof onStoryUpdate === 'function') {
                      await onStoryUpdate();
                    }
                    alert('Verse deleted successfully!');
                  } catch (error) {
                    console.error('Error deleting verse:', error);
                    alert('Error deleting verse. Please try again.');
                  }
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <i className="fas fa-trash-alt"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute/Edit Modal */}
      <ContributeModal
        showContributeModal={showContributeModal}
        setShowContributeModal={setShowContributeModal}
        story={story}
        editingVerse={editingVerse}
        onStoryUpdated={async () => {
          if (typeof onStoryUpdate === 'function') {
            await onStoryUpdate();
          }
          setEditingVerse(null);
        }}
      />
      
      {/* Custom styles */}
      <style jsx global>{`
        * {
          scroll-behavior: smooth;
        }
        
        .scroll-smooth {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(0) translateX(20px);
          }
          75% {
            transform: translateY(20px) translateX(10px);
          }
          100% {
            transform: translateY(0) translateX(0);
          }
        }
      `}</style>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(viewer, document.body);
  }

  return null;
};

export default VerseViewer;