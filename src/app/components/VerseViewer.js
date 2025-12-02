"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { absoluteUrl, versesApi, userApi } from '../../../lib/api';
import ContributeModal from './storycard/ContributeModal';
import { useRouter } from 'next/navigation';
import ShareModal from './ShareModal';
import { createPortal } from 'react-dom';

// Helper to get an image URL from a moment
const getMomentImageUrl = (moment) => {
  if (!moment) return null;
  if (typeof moment === 'string') return absoluteUrl(moment);
  if (moment.image) {
    if (typeof moment.image === 'string') return absoluteUrl(moment.image);
    if (Array.isArray(moment.image) && moment.image.length > 0) {
      const im = moment.image[0];
      if (!im) return null;
      if (typeof im === 'string') return absoluteUrl(im);
      return absoluteUrl(im.file_url || im.url || im);
    }
    if (moment.image.file_url) return absoluteUrl(moment.image.file_url);
    if (moment.image.url) return absoluteUrl(moment.image.url);
    if (moment.image.file) {
      if (typeof moment.image.file === 'string') return absoluteUrl(moment.image.file);
      if (moment.image.file.url) return absoluteUrl(moment.image.file.url);
    }
  }
  if (moment.file_url) return absoluteUrl(moment.file_url);
  if (moment.url) return absoluteUrl(moment.url);
  if (moment.images && Array.isArray(moment.images) && moment.images.length > 0) {
    const im = moment.images[0];
    if (!im) return null;
    if (typeof im === 'string') return absoluteUrl(im);
    return absoluteUrl(im.file_url || im.url || im);
  }
  return null;
};

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

// Custom smooth scroll function with easing
const smoothScroll = (element, target, duration = 500, horizontal = false) => {
  // If the difference is very small, just set the position directly
  const start = horizontal ? element.scrollLeft : element.scrollTop;
  const change = target - start;
  
  if (Math.abs(change) < 2) {
    if (horizontal) {
      element.scrollLeft = target;
    } else {
      element.scrollTop = target;
    }
    return;
  }

  const startTime = performance.now();
  
  // Use a custom easing function that's more gentle at the start and end
  const easeOutQuart = (t) => {
    return 1 - Math.pow(1 - t, 4);
  };
  
  const animateScroll = (currentTime) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easeProgress = easeOutQuart(progress);
    
    if (horizontal) {
      element.scrollLeft = start + change * easeProgress;
    } else {
      element.scrollTop = start + change * easeProgress;
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };
  
  requestAnimationFrame(animateScroll);
};

// Throttle function for scroll events
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

const VerseViewer = ({ 
  isOpen, 
  onClose, 
  story, 
  initialVerseIndex = 0,
  onReady,
  isAuthenticated,
  openAuthModal,
  onStoryUpdate, // New prop to handle story updates
  onOpenStoryForm, // Prop to open StoryFormModal for story creators
}) => {
  // Font size state for zoom controls (text-only verses)
  const [fontSize, setFontSize] = useState(32);
  const { currentUser } = useAuth();
  const router = useRouter();
  const [showVerseOptions, setShowVerseOptions] = useState(false);
  const [editingVerse, setEditingVerse] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(() => {
    // Prefer story-provided follow flags, fall back to false
    return story?.isFollowing || story?.is_following || false;
  });
  
  // Ref for verse options menu
  const verseOptionsRef = useRef(null);

  // Handle click outside for verse options menu
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
  const [currentVerseIndex, setCurrentVerseIndex] = useState(initialVerseIndex);
  
  // Create a ref to store the latest story data
  const storyRef = useRef(story);
  useEffect(() => {
    storyRef.current = story;
  }, [story]);

  // Store verse metadata in a ref to persist across scrolling
  const verseMetadataRef = useRef({});

  // Get current verse from the story
  const currentVerse = useMemo(() => {
    if (!storyRef.current?.verses || currentVerseIndex >= storyRef.current.verses.length) {
      return null;
    }
    return storyRef.current.verses[currentVerseIndex];
  }, [currentVerseIndex, storyRef.current?.verses]);

  // Get metadata for current verse from our metadata cache
  const getCurrentVerseMetadata = useCallback(() => {
    if (!currentVerse?.id) return null;
    return verseMetadataRef.current[currentVerse.id];
  }, [currentVerse?.id]);

  // Initialize metadata state from cache or verse data
  const [isLiked, setIsLiked] = useState(() => {
    const metadata = getCurrentVerseMetadata();
    if (metadata) return metadata.is_liked_by_user;
    return currentVerse?.user_has_liked || currentVerse?.is_liked_by_user || false;
  });
  const [isSaved, setIsSaved] = useState(() => {
    const metadata = getCurrentVerseMetadata();
    if (metadata) return metadata.is_saved_by_user;
    return currentVerse?.user_has_saved || currentVerse?.is_saved_by_user || false;
  });
  const [likeCount, setLikeCount] = useState(() => {
    const metadata = getCurrentVerseMetadata();
    if (metadata) return metadata.likes_count;
    return currentVerse?.likes_count || 0;
  });
  const [saveCount, setSaveCount] = useState(() => {
    const metadata = getCurrentVerseMetadata();
    if (metadata) return metadata.saves_count;
    return currentVerse?.saves_count || 0;
  });
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);
  // Modal state
  // const [showContributeModal, setShowContributeModal] = useState(false);
  
  const verseRefs = useRef([]);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  
  const momentsContainerRef = useRef(null);
  
  // Touch tracking for moments carousel
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  
  // Check if current verse has moments (images)
  const hasMoments = currentVerse?.moments && currentVerse.moments.length > 0;
  const hasMultipleMoments = hasMoments && currentVerse.moments.length > 1;
  
  // Helper function to get user ID from different possible formats
  const getUserId = (user) => {
    if (!user) return null;
    
    // If user is already an ID (number or string)
    if (typeof user === 'number' || typeof user === 'string') {
      return user;
    }
    
    // If user is an object with id property
    if (user.id !== undefined) {
      return user.id;
    }
    
    // If user is an object with public_id property
    if (user.public_id !== undefined) {
      return user.public_id;
    }
    
    return null;
  };

  // Helper functions to derive author display fields (robust to different API shapes)
  const getAuthor = () => currentVerse?.author || null;

  const getAuthorDisplayName = () => {
    const a = getAuthor();
    if (!a) return 'Poster Name';

    // Check if account is brand type and has brand_name
    if (a.account_type === 'brand' && a.brand_name) {
      return a.brand_name;
    }

    const full = a.get_full_name || a.full_name || a.display_name || a.name;
    if (full) return full;

    const first = a.first_name || a.firstname || '';
    const last = a.last_name || a.lastname || '';
    if (first || last) return `${first} ${last}`.trim();

    return a.username || a.public_id || 'Poster Name';
  };
  const getAuthorProfileImageUrl = () => {
    const a = getAuthor();
    if (!a) return null;
    // Prefer profile_image_url if present (matches backend serializer)
    if (a.profile_image_url) return absoluteUrl(a.profile_image_url);
    const maybe = a.profile_image || a.image || a.avatar || a.photo || a.picture || (a.profile && (a.profile.image || a.profile.avatar));
    if (!maybe) return null;
    if (typeof maybe === 'string') return absoluteUrl(maybe);
    if (maybe.url) return absoluteUrl(maybe.url);
    if (maybe.file_url) return absoluteUrl(maybe.file_url);
    return null;
  };

  // (Follow handler implemented inline on avatar button to match CreatorChip behaviour)

  const getAuthorInitial = () => {
    const name = getAuthorDisplayName() || getAuthorUsername() || 'P';
    return (name && name.charAt && name.charAt(0).toUpperCase()) || 'P';
  };
  
  // Check if current verse is a contribution (not by the story creator)
  const isContribution = (() => {
    if (!currentVerse || !story || !currentVerse.author) {
      return false;
    }
    
    const authorId = getUserId(currentVerse.author);
    const creatorId = getUserId(story.creator);
    
    // If we can't get both IDs, assume it's not a contribution
    if (!authorId || !creatorId) {
      return false;
    }
    
    // Compare the IDs as strings to handle different formats
    return String(authorId) !== String(creatorId);
  })();

  // Helper to get the author's username (handles multiple shapes)
  const getAuthorUsername = () => {
    if (!currentVerse) return null;
    const a = currentVerse.author;
    if (!a) return currentVerse.author_name || currentVerse.author_username || null;
    if (typeof a === 'string') return a;
    if (a.username) return a.username;
    if (a.user && a.user.username) return a.user.username;
    if (a.profile && a.profile.username) return a.profile.username;
    return currentVerse.author_name || currentVerse.author_username || null;
  };
  
  // Update metadata when current verse changes
  useEffect(() => {
    if (currentVerse) {
      // Force immediate metadata update from the current verse
      setIsLiked(currentVerse.user_has_liked || currentVerse.is_liked_by_user || false);
      setIsSaved(currentVerse.user_has_saved || currentVerse.is_saved_by_user || false);
      setLikeCount(currentVerse.likes_count || 0);
      setSaveCount(currentVerse.saves_count || 0);
      setCurrentMomentIndex(0);
      setIsContentExpanded(false);
      setIsTextVisible(true);
    }
  }, [currentVerse?.id]); // Only run when the verse ID changes, not on every verse prop change

  // Sync metadata with story updates
  useEffect(() => {
    if (currentVerse && storyRef.current?.verses) {
      const latestVerse = storyRef.current.verses.find(v => v.id === currentVerse.id);
      if (latestVerse) {
        setIsLiked(latestVerse.user_has_liked || latestVerse.is_liked_by_user || false);
        setIsSaved(latestVerse.user_has_saved || latestVerse.is_saved_by_user || false);
        setLikeCount(latestVerse.likes_count || 0);
        setSaveCount(latestVerse.saves_count || 0);
      }
    }
  }, [storyRef.current?.verses]); // Run when story verses update
  
  // Function to update verse metadata in our cache and state
  const updateVerseMetadata = useCallback((verseId, metadata) => {
    if (!verseId || !metadata) return;

    // Update metadata cache
    verseMetadataRef.current[verseId] = metadata;

    // Update local state if this is the current verse
    if (currentVerse?.id === verseId) {
      setIsLiked(metadata.is_liked_by_user);
      setLikeCount(metadata.likes_count);
      setIsSaved(metadata.is_saved_by_user);
      setSaveCount(metadata.saves_count);
    }

    // Update story ref
    if (storyRef.current?.verses) {
      const updatedVerses = storyRef.current.verses.map(verse => 
        verse.id === verseId 
          ? { ...verse, ...metadata }
          : verse
      );
      
      const updatedStory = {
        ...storyRef.current,
        verses: updatedVerses
      };
      
      // Update story ref
      storyRef.current = updatedStory;
      
      // Call parent update if available
      if (typeof onStoryUpdate === 'function') {
        onStoryUpdate(updatedStory);
      }
    }
  }, [currentVerse?.id, onStoryUpdate]);

  // Function to fetch fresh verse metadata
  const fetchVerseMetadata = async (verse) => {
    if (!verse?.slug || !isAuthenticated) return null;
    try {
      const response = await versesApi.getVerseBySlug(verse.slug);
      const metadata = {
        is_liked_by_user: response.is_liked_by_user || response.user_has_liked || false,
        likes_count: response.likes_count || 0,
        is_saved_by_user: response.is_saved_by_user || response.user_has_saved || false,
        saves_count: response.saves_count || 0
      };
      
      // Update our metadata cache and state
      updateVerseMetadata(verse.id, metadata);
      return metadata;
    } catch (error) {
      error('Error fetching verse metadata:', error);
      return null;
    }
  };

  // Show scroll hint after 1 second if there are more verses below current verse, then hide after 3 seconds of showing
  useEffect(() => {
    if (!isOpen || !story?.verses || story.verses.length <= 1) {
      setShowScrollHint(false);
      return;
    }

    // Don't show hint on the last verse
    if (currentVerseIndex >= story.verses.length - 1) {
      setShowScrollHint(false);
      return;
    }

    // Show hint after 1 second
    const showTimer = setTimeout(() => {
      setShowScrollHint(true);
    }, 1000);

    // Hide hint after showing for 3 seconds (total 4 seconds)
    const hideTimer = setTimeout(() => {
      setShowScrollHint(false);
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isOpen, story?.verses, currentVerseIndex]);

  // Hide scroll hint when user scrolls
  useEffect(() => {
    const handleScroll = () => {
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentVerseIndex(initialVerseIndex);
      setIsContentExpanded(false);
      setFocusMode(false);
      setIsTextVisible(true);
      
      // Pre-fetch metadata for all verses to ensure we have the data
      if (story?.verses) {
        Promise.all(story.verses.map(verse => fetchVerseMetadata(verse))).then(metadataArray => {
          const updatedVerses = story.verses.map((verse, index) => {
            const metadata = metadataArray[index];
            if (metadata) {
              return {
                ...verse,
                ...metadata,
                user_has_liked: metadata.is_liked_by_user,
                user_has_saved: metadata.is_saved_by_user
              };
            }
            return verse;
          });

          const updatedStory = {
            ...storyRef.current,
            verses: updatedVerses
          };

          // Update story ref
          storyRef.current = updatedStory;

          // Call parent update if available
          if (typeof onStoryUpdate === 'function') {
            onStoryUpdate(updatedStory);
          }

          // Set initial verse state
          const initialVerse = updatedVerses[initialVerseIndex];
          if (initialVerse) {
            setIsLiked(initialVerse.is_liked_by_user || initialVerse.user_has_liked || false);
            setLikeCount(initialVerse.likes_count || 0);
            setIsSaved(initialVerse.is_saved_by_user || initialVerse.user_has_saved || false);
            setSaveCount(initialVerse.saves_count || 0);
          }
        });
      }
      
      // (Removed automatic scroll hint teaser)
    }
    
    return () => {
      // cleanup
    };
  }, [isOpen, initialVerseIndex, story]);

  // Notify parent that the viewer has rendered and is ready (used to stop button loading states)
  useEffect(() => {
    if (isOpen && typeof onReady === 'function') {
      // Wait for next paint to ensure viewer is mounted and visible
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { onReady(); } catch (e) { /* ignore */ }
      }));
    }
  }, [isOpen, onReady]);

  // Update the browser URL (replaceState) to include the current verse id when viewer is open.
  // This makes the URL shareable and consistent with server-side metadata when someone visits.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!isOpen) {
        // remove verse param when viewer closes
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

  // Handle touch events for swipe-back detection
  useEffect(() => {
    if (!containerRef.current || !isOpen) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      // Enable swipe back when we're at the first moment of any verse
      if (currentMomentIndex === 0) {
        startX = e.touches[0].clientX;
        isDragging = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      
      currentX = e.touches[0].clientX;
      const diffX = currentX - startX;

      if (diffX > 0) { // Only allow right swipe
        containerRef.current.style.transform = `translateX(${diffX}px)`;
        containerRef.current.style.transition = 'none';
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      
      isDragging = false;
      const diffX = currentX - startX;

      containerRef.current.style.transition = 'transform 0.3s ease';
      
      if (diffX > 100) { // Threshold to trigger close
        containerRef.current.style.transform = 'translateX(100%)';
        setTimeout(() => {
          onClose();
          containerRef.current.style.transform = '';
          containerRef.current.style.transition = '';
        }, 300);
      } else {
        // Reset position
        containerRef.current.style.transform = '';
        setTimeout(() => {
          containerRef.current.style.transition = '';
        }, 300);
      }
    };

    const container = containerRef.current;
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentVerseIndex, currentMomentIndex, isOpen, onClose]);

  // Track if user is actively scrolling
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeout = useRef(null);

  // Handle scroll events to detect current verse and update metadata (throttled)
  useEffect(() => {
    // We'll update progress continuously while scrolling and snap after scroll end
    const scrollEndTimeoutRef = { current: null };

    const handleScroll = throttle(() => {
      if (!containerRef.current || !story?.verses) return;

      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight || 1;

      const fractionalIndex = scrollTop / containerHeight; // e.g. 0.0 => first verse, 0.5 => halfway to second
      const total = story.verses.length || 1;

      // Continuous progress while user scrolls
      const continuousProgress = ((fractionalIndex + 1) / total) * 100;
      setReadingProgress(Math.max(0, Math.min(100, continuousProgress)));

      // Determine nearest verse index for state updates
      const nearestIndex = Math.round(fractionalIndex);

      if (nearestIndex >= 0 && nearestIndex < total && nearestIndex !== currentVerseIndex) {
        setIsTransitioning(true);
        setCurrentVerseIndex(nearestIndex);

        const newCurrentVerse = storyRef.current?.verses?.[nearestIndex];
        if (newCurrentVerse) {
          setIsLiked(newCurrentVerse.is_liked_by_user || newCurrentVerse.user_has_liked || false);
          setIsSaved(newCurrentVerse.is_saved_by_user || newCurrentVerse.user_has_saved || false);
          setLikeCount(newCurrentVerse.likes_count || 0);
          setSaveCount(newCurrentVerse.saves_count || 0);
          setCurrentMomentIndex(0);

          // Refresh metadata in background
          fetchVerseMetadata(newCurrentVerse).then(metadata => {
            if (metadata && currentVerseIndex === nearestIndex) {
              const updatedVerses = storyRef.current.verses.map(verse => 
                verse.id === newCurrentVerse.id 
                  ? { 
                      ...verse,
                      ...metadata,
                      user_has_liked: metadata.is_liked_by_user,
                      user_has_saved: metadata.is_saved_by_user
                    }
                  : verse
              );

              const updatedStory = { ...storyRef.current, verses: updatedVerses };
              storyRef.current = updatedStory;

              setIsLiked(metadata.is_liked_by_user);
              setLikeCount(metadata.likes_count);
              setIsSaved(metadata.is_saved_by_user);
              setSaveCount(metadata.saves_count);

              if (typeof onStoryUpdate === 'function') {
                onStoryUpdate(updatedStory);
              }
            }
            }).catch(() => {});
        }
      }

      // Debounce to detect scroll end and snap to nearest verse
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = setTimeout(() => {
        if (!containerRef.current) return;
        const c = containerRef.current;
        const idx = Math.round(c.scrollTop / (c.clientHeight || 1));
        const targetPosition = idx * c.clientHeight;
        // Animate snap
        smoothScroll(c, targetPosition, 300, false);
        // Finalize progress to snapped value
        const finalProgress = ((idx + 1) / total) * 100;
        setReadingProgress(Math.max(0, Math.min(100, finalProgress)));
        setIsTransitioning(false);
      }, 120);
    }, 35);

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => {
        containerElement.removeEventListener('scroll', handleScroll);
        if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      };
    }
  }, [currentVerseIndex, story?.verses, fetchVerseMetadata, onStoryUpdate]); // Added dependencies for metadata refresh

  // Handle like action with optimistic UI and proper story state update
  const handleLike = async () => {
    if (!currentVerse || !currentVerse.slug) return;
    if (!isAuthenticated) {
      if (typeof openAuthModal === 'function') openAuthModal('like', { slug: story.slug, verseId: currentVerse.id });
      return;
    }
    
    // Optimistic UI update
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? likeCount + 1 : Math.max(0, likeCount - 1);
    
    // Update local state
    setIsLiked(newLikedState);
    setLikeCount(newLikeCount);
    
    try {
      // Make API call
      const response = await versesApi.toggleLikeBySlug(currentVerse.slug);
      
      // Update metadata cache and state
      const metadata = {
        is_liked_by_user: response.is_liked_by_user,
        likes_count: response.likes_count,
        is_saved_by_user: isSaved, // Preserve current save state
        saves_count: saveCount // Preserve current save count
      };
      
      // Update metadata cache and trigger all necessary updates
      updateVerseMetadata(currentVerse.id, metadata);
      
    } catch (error) {
      // Revert on error
      setIsLiked(!newLikedState);
      setLikeCount(likeCount);
      error('Error toggling verse like:', error);
    }
  };

  // Handle save action with optimistic UI and proper story state update
  const handleSave = async () => {
    if (!currentVerse || !currentVerse.slug) return;
    if (!isAuthenticated) {
      if (typeof openAuthModal === 'function') openAuthModal('save', { slug: story.slug, verseId: currentVerse.id });
      return;
    }
    
    // Optimistic UI update
    const newSavedState = !isSaved;
    const newSaveCount = newSavedState ? saveCount + 1 : Math.max(0, saveCount - 1);
    
    // Update local state
    setIsSaved(newSavedState);
    setSaveCount(newSaveCount);
    
    try {
      const response = await versesApi.toggleSaveBySlug(currentVerse.slug);
      
      // Update metadata cache and state
      const metadata = {
        is_saved_by_user: response.is_saved_by_user,
        saves_count: response.saves_count,
        is_liked_by_user: isLiked, // Preserve current like state
        likes_count: likeCount // Preserve current like count
      };
      
      // Update metadata cache and trigger all necessary updates
      updateVerseMetadata(currentVerse.id, metadata);
      
    } catch (error) {
      // Revert on error
      setIsSaved(!newSavedState);
      setSaveCount(saveCount);
      error('Error toggling verse save:', error);
    }
  };

  // Handle share action
  const handleShare = () => {
    // Open the app's ShareModal with verse-specific data
    if (!currentVerse || !story) return;

    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const verseId = currentVerse?.id || currentVerse?.public_id || currentVerse?.slug || '';
    const encodedSlug = story && story.slug ? encodeURIComponent(story.slug) : '';
    const encodedVerseId = typeof verseId === 'string' || typeof verseId === 'number' ? encodeURIComponent(verseId) : '';
    const verseUrl = origin
      ? `${origin}/stories/${encodedSlug}/?verse=${encodedVerseId}`
      : `/stories/${encodedSlug}/?verse=${encodedVerseId}`;

    const payload = {
      title: `${story.title || 'StoryVerm'} - Verse ${currentVerseIndex + 1}`,
      description: (currentVerse.content || '').slice(0, 240),
      url: verseUrl
    };

    const imageForShare = (currentVerse && currentVerse.moments && currentVerse.moments[currentMomentIndex]) ? getMomentImageUrl(currentVerse.moments[currentMomentIndex]) : getMomentImageUrl(story?.verses && story.verses[0]?.moments && story.verses[0].moments[0]);

    setShareData(payload);
    setShareImage(imageForShare || null);
    setShowShareModal(true);
  };

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareImage, setShareImage] = useState(null);

  // Handle opening contribute modal
  const handleOpenContribute = () => {
    if (!isAuthenticated) {
      if (typeof openAuthModal === 'function') openAuthModal('contribute', { slug: story.slug, id: story.id });
      return;
    }
    setShowContributeModal(true);
  };

  // Touch handlers for moments carousel
  const handleMomentTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleMomentTouchMove = (e) => {
    touchEndRef.current = e.touches[0].clientX;
    
    // Prevent default only if we're swiping horizontally
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current;
    const deltaY = touch.clientY - (e.targetTouches[0].clientY || 0);
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  };

  const handleMomentTouchEnd = () => {
    const start = touchStartRef.current;
    const end = touchEndRef.current;
    
    if (!start || !end) return;
    
    const diff = start - end;
    
    // Swipe threshold - only 50px needed to trigger
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left - go to next moment
        goToNextMoment();
      } else {
        // Swipe right - go to previous moment
        goToPreviousMoment();
      }
    }
  };

  // Navigate to previous moment
  const goToPreviousMoment = () => {
    if (!currentVerse || currentMomentIndex <= 0) return;
    setCurrentMomentIndex(prev => prev - 1);
  };

  // Navigate to next moment
  const goToNextMoment = () => {
    if (!currentVerse || !currentVerse.moments || currentMomentIndex >= currentVerse.moments.length - 1) return;
    setCurrentMomentIndex(prev => prev + 1);
  };

  // Toggle focus mode
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  // Check if content has more than 3 lines
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

  // Generate colorful bubbles
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

  if (!isOpen || !story) return null;

  const viewer = (
    <div className={`fixed inset-0 z-[201] bg-gradient-to-br ${defaultTheme.gradient} ${defaultTheme.shadow} transition-all duration-1000 rounded-3xl border ${defaultTheme.border}`} style={{overflow: 'hidden'}}>
      {/* Glassy border and subtle vignette, matching ContributeModal */}
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

      {/* Unique reading progress indicator - always visible; high z-index so it's not occluded */}
      <div className="fixed top-0 left-0 right-0 h-2 z-[9999] bg-black/30 pointer-events-none rounded-b-2xl">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 transition-all duration-300 ease-out rounded-b-2xl shadow-lg shadow-cyan-400/20"
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>

      {/* Scroll hint teaser - shows colorful animated down arrow when there are more verses */}
      {showScrollHint && story?.verses && story.verses.length > 1 && (
        <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="animate-bounce">
            <i className="fas fa-chevron-down text-4xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse drop-shadow-lg"></i>
          </div>
        </div>
      )}

      {/* Fixed Header with luxury glassmorphism */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${defaultTheme.glass} border-b border-cyan-400/20 p-4 transition-opacity duration-500 ${!focusMode ? 'opacity-100' : 'opacity-0 pointer-events-none'} shadow-lg shadow-cyan-900/10`}> 
        <div className="flex justify-between items-center">
          <div className="text-white font-medium flex items-center gap-2 min-w-0">
            <div className={`w-3 h-3 rounded-full bg-${defaultTheme.accent} animate-pulse`}></div>
            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 bg-clip-text text-transparent truncate block max-w-[60vw] font-bold tracking-wide drop-shadow-lg" title={`${story.title} - Verse ${currentVerseIndex + 1} of ${story.verses.length}`}>
              {story.title} <span className="opacity-60 font-normal">- Verse {currentVerseIndex + 1} of {story.verses.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-all border border-cyan-400/20 shadow"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Vertical scroll container for verses - TikTok style */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll scrollbar-hide overscroll-none scroll-optimized no-bounce snap-y snap-mandatory"
        style={{ scrollBehavior: 'auto' }} // Removed snap scrolling to prevent unwanted auto-scroll
        onTouchStart={() => setIsUserScrolling(true)}
        onTouchEnd={() => {
          if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
          userScrollTimeout.current = setTimeout(() => setIsUserScrolling(false), 150);
        }}
        onWheel={() => {
          setIsUserScrolling(true);
          if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
          userScrollTimeout.current = setTimeout(() => setIsUserScrolling(false), 150);
        }}
      >
        <div ref={contentRef}>
          {story.verses.map((verse, index) => (
            <div 
              key={`verse-${verse.id}-${index}`}
              ref={el => verseRefs.current[index] = el}
              className="h-screen w-full flex flex-col relative transition-all duration-500 overflow-hidden snap-start"
            >
              {/* Moments (horizontal scroll) */}
              {verse.moments && verse.moments.length > 0 ? (
                <div className="flex-1 flex items-center justify-center bg-black/10 cursor-pointer relative" onClick={toggleFocusMode}>
                  {/* Left scroll indicator - hidden in focus mode */}
                  {!focusMode && hasMultipleMoments && currentMomentIndex > 0 && (
                    <button 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 backdrop-blur-lg rounded-full p-3 animate-pulse hover:bg-black/70 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPreviousMoment();
                      }}
                    >
                      <i className="fas fa-chevron-left text-white"></i>
                    </button>
                  )}
                  
                  {/* Right scroll indicator - hidden in focus mode */}
                  {!focusMode && hasMultipleMoments && currentMomentIndex < verse.moments.length - 1 && (
                    <button 
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 backdrop-blur-lg rounded-full p-3 animate-pulse hover:bg-black/70 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextMoment();
                      }}
                    >
                      <i className="fas fa-chevron-right text-white"></i>
                    </button>
                  )}
                  
                  {/* Moments container with touch handlers */}
                  <div 
                    className="w-full h-full relative overflow-hidden"
                    onTouchStart={handleMomentTouchStart}
                    onTouchMove={handleMomentTouchMove}
                    onTouchEnd={handleMomentTouchEnd}
                  >
                    {verse.moments.map((moment, momentIndex) => {
                      const imageUrl = getMomentImageUrl(moment);
                      const momentKey = moment && (moment.id || `moment-${momentIndex}`);
                      return (
                        <div 
                          key={momentKey} 
                          className={`absolute inset-0 transition-opacity duration-300 ${momentIndex === currentMomentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        >
                          {imageUrl ? (
                            <div className="relative w-full h-full">
                              {/* FIXED: Replaced Next.js Image with regular img tag */}
                              <img
                                src={imageUrl}
                                alt={`Verse moment ${momentIndex + 1}`}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                              
                              {/* Focus indicator overlay */}
                              <div className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${focusMode ? 'opacity-0' : 'opacity-100'}`}></div>
                            </div>
                          ) : moment && moment.content ? (
                            <div className="w-full h-full flex items-center justify-center p-8">
                              <div className="text-white text-3xl text-center font-light max-w-3xl">
                                {moment.content}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-8">
                              <div className="text-gray-300 text-sm text-center">No moment available</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Unique horizontal scroll indicator */}
                  <div className="absolute bottom-32 left-0 right-0 flex justify-center space-x-2 z-60">
                    {verse.moments.map((_, momentIndex) => (
                      <div 
                        key={`indicator-${momentIndex}`}
                        className={`w-2 h-2 rounded-full transition-all duration-300 shadow-lg ${momentIndex === currentMomentIndex ? 'bg-white w-8' : 'bg-white/30'}`}
                      ></div>
                    ))}
                  </div>
                </div>
              ) : (
                /* If no moments, show verse content in the main area */
                <div className="flex-1 flex justify-center bg-black/10 cursor-pointer relative" onClick={toggleFocusMode}>
                  {/* Zoom controls for text-only verse */}
                  <div className="absolute top-20 right-3 z-20 flex flex-row gap-2 items-end">
                    <button
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-200/50 to-blue-500/50 text-white shadow-lg  flex items-center justify-center hover:scale-110 transition-transform border border-cyan-400/40 text-2xl font-bold"
                      onClick={e => { e.stopPropagation(); setFontSize(f => Math.min(f + 4, 80)); }}
                      title="Zoom In"
                      tabIndex={0}
                    >
                      +
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/50 to-blue-500/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-cyan-400/40 text-2xl font-bold"
                      onClick={e => { e.stopPropagation(); setFontSize(f => Math.max(f - 4, 12)); }}
                      title="Zoom Out"
                      tabIndex={0}
                    >
                      −
                    </button>
                  </div>
                  <div
                    className="w-full max-w-3xl h-full relative"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'stretch',
                      height: '100%',
                    }}
                  >
                    <div
                      className="overflow-y-auto px-6 py-8"
                      style={{
                        maxHeight: 'calc(100vh - 160px)', // leave space for header/footer
                        minHeight: '120px',
                        marginTop: '64px', // header height
                        marginBottom: '80px', // footer height
                      }}
                    >
                      <div
                        className="text-white font-light"
                        style={{ whiteSpace: 'pre-line', textAlign: 'left', fontSize: fontSize, transition: 'font-size 0.2s' }}
                      >
                        {verse.content || 'No content for this verse'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed Content Area with glassmorphism - only show when there are moments */}
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
      
      {/* Fixed Footer with glassmorphism - always show when not in focus mode */}
      {!focusMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/60 backdrop-blur-lg to-transparent p-4">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0" style={{ width: '3rem', height: '3rem' }}>
                <a
                  href={`/${encodeURIComponent(getAuthorUsername() || '')}`}
                  className="block w-full h-full"
                  onClick={(e) => {
                    e.preventDefault();
                    const u = getAuthorUsername();
                    if (u) router.push(`/${encodeURIComponent(u)}`);
                  }}
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer overflow-hidden">
                    {/* FIXED: Replaced Next.js Image with regular img tag */}
                    {getAuthorProfileImageUrl() ? (
                      <img 
                        src={getAuthorProfileImageUrl()} 
                        alt={`${getAuthorDisplayName()}'s profile`} 
                        className="w-full h-full object-cover" 
                        onError={e => {
                          // Hide image and show initials if image fails to load
                          e.target.style.display = 'none';
                          const fallback = e.target.parentNode.querySelector('.author-initial-fallback');
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span className="text-white author-initial-fallback" style={{display: getAuthorProfileImageUrl() ? 'none' : 'block'}}>{getAuthorInitial()}</span>
                  </div>
                </a>
                {/* Follow button overlay on avatar (same style & behavior as CreatorChip) */}
                {getAuthorUsername() && !isFollowing && String(getUserId(currentVerse?.author || story?.creator || '')) !== String(currentUser?.public_id) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const username = getAuthorUsername();
                      log('Follow button clicked, username:', username); // Debug log
                      setIsFollowing(true); // Optimistically hide immediately and never revert
                      if (!isAuthenticated) {
                        if (typeof openAuthModal === 'function') openAuthModal('follow', username);
                        return;
                      }
                      userApi.followUser(username)
                        .then(() => {
                          log('Follow API call succeeded for:', username);
                        })
                        .catch((err) => {
                          error('Failed to follow user:', err);
                          // Do not revert isFollowing
                        });
                    }}
                    className="follow-button absolute bottom-0 right-0 bg-transparent border-2 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
                    aria-label="Follow"
                    title="Follow"
                  >
                    <i className="fas fa-plus text-white font-extrabold text-xl"></i>
                  </button>
                )}
              </div>

              <div className="text-white min-w-0 flex items-center gap-3">
                <div>
                  <a
                    href={`/${encodeURIComponent(getAuthorUsername() || '')}`}
                    className="block min-w-0"
                    onClick={(e) => {
                      e.preventDefault();
                      const u = getAuthorUsername();
                      if (u) router.push(`/${encodeURIComponent(u)}`);
                    }}
                  >
                    <span className="font-semibold text-sm truncate block max-w-[18rem]" title={getAuthorDisplayName()}>{getAuthorDisplayName()}</span>
                  </a>
                  <div className={`text-xs ${isContribution ? 'text-orange-400' : 'text-cyan-300'}`}>
                    {isContribution ? 'Contributed' : 'Creator'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vertical buttons container */}
            <div className="absolute bottom-4 right-4 flex flex-col items-center gap-6 z-50">
              {/* Ellipsis Menu Button (at very top) - for verse creators and contributors */}
              {isAuthenticated && currentUser && (String(currentUser?.public_id || currentUser?.id) === String(getUserId(currentVerse?.author)) || String(currentUser?.public_id || currentUser?.id) === String(getUserId(story?.creator))) && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowVerseOptions(!showVerseOptions);
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-white/20 hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110"
                    title="Options"
                  >
                    <i className="fas fa-ellipsis-v text-[18px] text-white"></i>
                  </button>
                  {showVerseOptions && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl overflow-hidden bg-gray-900/95 backdrop-blur-lg border border-white/10 shadow-xl z-50" ref={verseOptionsRef}>
                      <button
                        onClick={() => {
                          setShowVerseOptions(false);
                          // Check if user is the verse author (contributor) or story creator
                          const isVerseAuthor = String(currentUser?.public_id || currentUser?.id) === String(getUserId(currentVerse?.author));
                          const isStoryCreator = String(currentUser?.public_id || currentUser?.id) === String(getUserId(story?.creator));
                          
                          // Contributors (verse authors) should only edit via ContributeModal
                          // Story creators can use StoryFormModal if available
                          if (isVerseAuthor && !isStoryCreator) {
                            // This is a contributor, open ContributeModal only
                            setEditingVerse(currentVerse);
                            setShowContributeModal(true);
                          } else if (isStoryCreator && typeof onOpenStoryForm === 'function') {
                            // Story creator - use the StoryFormModal
                            onOpenStoryForm(currentVerse);
                          } else {
                            // Fallback: open the contribute modal to edit verse
                            setEditingVerse(currentVerse);
                            setShowContributeModal(true);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-cyan-500/20 flex items-center gap-2 border-b border-white/10"
                      >
                        <i className="fas fa-edit text-cyan-400"></i>
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowVerseOptions(false);
                          setShowDeleteModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-red-500/20 flex items-center gap-2"
                      >
                        <i className="fas fa-trash-alt text-red-400"></i>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Like Button (below ellipsis) */}
              <div className="flex flex-col items-center">
                <button 
                  className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative ${isLiked ? 'bg-accent-orange/10 border-2 border-accent-orange' : 'border border-white/20'} hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110`}
                  onClick={handleLike}
                >
                  <div className="relative">
                    <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[18px] ${isLiked ? 'text-accent-orange' : 'text-white'}`}></i>
                    {isLiked && (
                      <div className="absolute inset-0 rounded-full bg-accent-orange animate-ping opacity-40"></div>
                    )}
                  </div>
                </button>
                <span className={`text-xs mt-1 ${isLiked ? 'text-accent-orange' : 'text-white'}`}>{likeCount}</span>
              </div>
              
              {/* Share Button (below like) */}
              <button 
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-white/20 hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110"
                onClick={handleShare}
              >
                <i className="fas fa-share text-[18px] text-white"></i>
              </button>
              
              {/* Save Button (below share) */}
              <div className="flex flex-col items-center">
                <button 
                  className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative ${isSaved ? 'bg-accent-orange/10 border-2 border-accent-orange' : 'border border-white/20'} hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110`}
                  onClick={handleSave}
                >
                  <div className="relative">
                    <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-[18px] ${isSaved ? 'text-accent-orange' : 'text-white'}`}></i>
                    {isSaved && (
                      <div className="absolute inset-0 rounded-full bg-accent-orange animate-ping opacity-40"></div>
                    )}
                  </div>
                </button>
                <span className={`text-xs mt-1 ${isSaved ? 'text-accent-orange' : 'text-white'}`}>{saveCount}</span>
              </div>
              
              {/* Contribute Button (at bottom) - only if story allows contributions */}
              {story.allow_contributions ? (
                <button
                  title="Contribute verse"
                  onClick={handleOpenContribute}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 border-4 border-white/20 shadow-xl flex items-center justify-center hover:scale-110 transition-transform relative group"
                  style={{ boxShadow: '0 4px 24px 0 rgba(0,255,255,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.10)' }}
                >
                  <span className="absolute inset-0 rounded-full bg-white/10 group-hover:bg-white/20 transition-all"></span>
                  <i className="fas fa-plus text-white text-2xl relative z-10"></i>
                </button>
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-700/40 text-gray-400 cursor-not-allowed relative group border-4 border-gray-400/20 shadow-xl"
                  title="Contributions are disabled for this story."
                  style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)' }}
                >
                  <span className="absolute inset-0 rounded-full bg-white/5"></span>
                  <i className="fas fa-plus text-2xl relative z-10"></i>
                  <span className="absolute bottom-[-2.2rem] left-1/2 -translate-x-1/2 bg-black/90 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Contributions are disabled for this story.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
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
          // Refresh the story data when a new contribution is added
          if (story && story.slug) {
            try {
              const updatedStory = await versesApi.getVersesByStorySlug(story.slug);
              // Update the story state with the new data
              // This will trigger a re-render with the new verse
            } catch (error) {
              error('Error refreshing story data:', error);
            }
          }
        }}
      />
      
      {/* Share Modal for verses */}
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
                    onClose(); // Close the viewer
                    if (typeof onStoryUpdate === 'function') {
                      await onStoryUpdate(); // Refresh the story data
                    }
                    alert('Verse deleted successfully!');
                  } catch (error) {
                    error('Error deleting verse:', error);
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
      
      {/* Custom styles for smooth animations */}
      <style jsx global>{`
        /* Smooth scrolling for all elements */
        * {
          scroll-behavior: smooth;
        }
        
        /* Enhanced smooth scrolling with cubic-bezier */
        .enhanced-smooth-scroll {
          scroll-behavior: smooth;
          scroll-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Optimize scrolling performance */
        .scroll-optimized {
          -webkit-overflow-scrolling: touch;
          will-change: scroll-position;
        }
        
        /* Prevent momentum scrolling bounce */
        .no-bounce {
          overscroll-behavior: none;
        }
        
        /* Snap scrolling for TikTok style */
        .snap-y {
          scroll-snap-type: y mandatory;
        }
        
        .snap-start {
          scroll-snap-align: start;
        }
      `}</style>
      
      {/* Custom styles for floating animation and slow bounce */}
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
        
        /* bounce-slow animation removed (scroll teaser) */
      `}</style>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(viewer, document.body);
  }

  return null;
};

export default VerseViewer;