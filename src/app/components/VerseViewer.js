'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { absoluteUrl, versesApi } from '../../../lib/api';
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

// Default theme for the viewer
const defaultTheme = {
  gradient: 'from-gray-900 via-blue-900 to-indigo-900',
  particles: ['bg-cyan-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400'],
  text: 'from-cyan-400 via-blue-400 to-indigo-500',
  accent: 'cyan-400'
};

// Custom smooth scroll function with easing
const smoothScroll = (element, target, duration = 500, horizontal = false) => {
  const start = horizontal ? element.scrollLeft : element.scrollTop;
  const change = target - start;
  const startTime = performance.now();
  
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  
  const animateScroll = (currentTime) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easeProgress = easeInOutCubic(progress);
    
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
  onStoryUpdate // New prop to handle story updates
}) => {
  const { currentUser } = useAuth();
  const router = useRouter();
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
  const [showContributeModal, setShowContributeModal] = useState(false);
  
  const verseRefs = useRef([]);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const scrollHintTimeoutRef = useRef(null);
  const momentsContainerRef = useRef(null);
  
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
    const maybe = a.profile_image || a.image || a.avatar || a.photo || a.picture || (a.profile && (a.profile.image || a.profile.avatar));
    if (!maybe) return null;
    if (typeof maybe === 'string') return absoluteUrl(maybe);
    if (maybe.url) return absoluteUrl(maybe.url);
    if (maybe.file_url) return absoluteUrl(maybe.file_url);
    return null;
  };

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
      console.error('Error fetching verse metadata:', error);
      return null;
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentVerseIndex(initialVerseIndex);
      setIsContentExpanded(false);
      setFocusMode(false);
      setIsTextVisible(true);
      setShowScrollHint(true);
      
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
      
      // Scroll to initial verse with smooth animation
      setTimeout(() => {
        if (verseRefs.current[initialVerseIndex] && containerRef.current) {
          const targetVerse = verseRefs.current[initialVerseIndex];
          const container = containerRef.current;
          const targetPosition = targetVerse.offsetTop;
          
          smoothScroll(container, targetPosition, 800);
        }
      }, 100);
      
      // Set timeout to show scroll hint after 2 seconds
      scrollHintTimeoutRef.current = setTimeout(() => {
        if (containerRef.current && story.verses.length > 1) {
          // Scroll down slightly and then back up to indicate there's more content
          const currentScroll = containerRef.current.scrollTop;
          smoothScroll(containerRef, currentScroll + 20, 300);
          
          setTimeout(() => {
            if (containerRef.current) {
              smoothScroll(containerRef, currentScroll, 300);
            }
          }, 500);
        }
        setShowScrollHint(false);
      }, 2000);
    }
    
    return () => {
      if (scrollHintTimeoutRef.current) {
        clearTimeout(scrollHintTimeoutRef.current);
      }
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

  // Handle scroll events to detect current verse and update metadata (throttled)
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (!containerRef.current || !story?.verses) return;
      
      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      let mostVisibleVerseIndex = currentVerseIndex;
      let maxVisibility = 0;
      
      // Find the most visible verse
      for (let i = 0; i < verseRefs.current.length; i++) {
        const verse = verseRefs.current[i];
        if (verse) {
          const verseTop = verse.offsetTop;
          const verseHeight = verse.offsetHeight;
          const verseBottom = verseTop + verseHeight;
          
          // Calculate how much of the verse is visible in the viewport
          const visibleTop = Math.max(scrollTop, verseTop);
          const visibleBottom = Math.min(scrollTop + containerHeight, verseBottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const visibility = visibleHeight / verseHeight;
          
          if (visibility > maxVisibility) {
            maxVisibility = visibility;
            mostVisibleVerseIndex = i;
          }
        }
      }
      
      // Update current verse if changed
      if (currentVerseIndex !== mostVisibleVerseIndex) {
        setIsTransitioning(true);
        setCurrentVerseIndex(mostVisibleVerseIndex);
        
        // Get the new current verse from our latest story ref data
        const newCurrentVerse = storyRef.current?.verses?.[mostVisibleVerseIndex];
        if (newCurrentVerse) {
          // Always set state from the verse data which includes our metadata
          setIsLiked(newCurrentVerse.is_liked_by_user || newCurrentVerse.user_has_liked || false);
          setIsSaved(newCurrentVerse.is_saved_by_user || newCurrentVerse.user_has_saved || false);
          setLikeCount(newCurrentVerse.likes_count || 0);
          setSaveCount(newCurrentVerse.saves_count || 0);
          setCurrentMomentIndex(0);
          
          // Refresh metadata in background to ensure it's up to date
          fetchVerseMetadata(newCurrentVerse).then(metadata => {
            if (metadata && currentVerseIndex === mostVisibleVerseIndex) {
              // Only update if we're still on the same verse
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
              
              const updatedStory = {
                ...storyRef.current,
                verses: updatedVerses
              };
              
              // Update story ref
              storyRef.current = updatedStory;
              
              // Update current state if needed
              setIsLiked(metadata.is_liked_by_user);
              setLikeCount(metadata.likes_count);
              setIsSaved(metadata.is_saved_by_user);
              setSaveCount(metadata.saves_count);
              
              // Call parent update if available
              if (typeof onStoryUpdate === 'function') {
                onStoryUpdate(updatedStory);
              }
            }
          });
        }
        
        // Snap to the exact position of this verse
        const targetVerse = verseRefs.current[mostVisibleVerseIndex];
        if (targetVerse && containerRef.current) {
          const targetPosition = targetVerse.offsetTop;
          setTimeout(() => {
            smoothScroll(containerRef, targetPosition, 300);
            setIsTransitioning(false);
          }, 50);
        }
      }
    }, 50);

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => containerElement.removeEventListener('scroll', handleScroll);
    }
  }, [currentVerseIndex, story?.verses]); // Added story.verses as dependency

  // Track reading progress (throttled)
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (!containerRef.current || !contentRef.current) return;
      
      const container = containerRef.current;
      const content = contentRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = content.scrollHeight - container.clientHeight;
      
      if (scrollHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
        setReadingProgress(progress);
      }
    }, 50);

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => containerElement.removeEventListener('scroll', handleScroll);
    }
  }, [currentVerseIndex]);

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
      console.error('Error toggling verse like:', error);
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
      console.error('Error toggling verse save:', error);
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

  // Handle horizontal scroll for moments (throttled)
  useEffect(() => {
    const handleMomentScroll = throttle((e) => {
      const container = e.target;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      
      const moments = container.querySelectorAll('.moment-item');
      moments.forEach((moment, index) => {
        const momentLeft = moment.offsetLeft;
        const momentWidth = moment.offsetWidth;
        
        if (scrollLeft >= momentLeft - containerWidth/2 && 
            scrollLeft < momentLeft + momentWidth - containerWidth/2) {
          if (currentMomentIndex !== index) {
            setCurrentMomentIndex(index);
          }
        }
      });
    }, 50);

    const containerElement = momentsContainerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleMomentScroll);
      return () => containerElement.removeEventListener('scroll', handleMomentScroll);
    }
  }, [currentMomentIndex]);

  // Navigate to previous moment with smooth animation
  const goToPreviousMoment = () => {
    if (!momentsContainerRef.current || !currentVerse || currentMomentIndex <= 0) return;
    
    const newIndex = currentMomentIndex - 1;
    setCurrentMomentIndex(newIndex);
    
    // Get the target moment element
    const moments = momentsContainerRef.current.querySelectorAll('.moment-item');
    if (moments[newIndex]) {
      const targetMoment = moments[newIndex];
      const container = momentsContainerRef.current;
      const containerWidth = container.clientWidth;
      const targetLeft = targetMoment.offsetLeft - (containerWidth / 2) + (targetMoment.offsetWidth / 2);
      
      smoothScroll(container, targetLeft, 600, true);
    }
  };

  // Navigate to next moment with smooth animation
  const goToNextMoment = () => {
    if (!momentsContainerRef.current || !currentVerse || !currentVerse.moments || currentMomentIndex >= currentVerse.moments.length - 1) return;
    
    const newIndex = currentMomentIndex + 1;
    setCurrentMomentIndex(newIndex);
    
    // Get the target moment element
    const moments = momentsContainerRef.current.querySelectorAll('.moment-item');
    if (moments[newIndex]) {
      const targetMoment = moments[newIndex];
      const container = momentsContainerRef.current;
      const containerWidth = container.clientWidth;
      const targetLeft = targetMoment.offsetLeft - (containerWidth / 2) + (targetMoment.offsetWidth / 2);
      
      smoothScroll(container, targetLeft, 600, true);
    }
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
    <div className={`fixed inset-0 z-[201] bg-gradient-to-br ${defaultTheme.gradient} transition-all duration-1000`}>
      {/* Colorful bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {renderColorfulBubbles()}
      </div>
      
      {/* Unique reading progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50 bg-black/20">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out" 
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>
      
      {/* Scroll hint indicator - applies to whole verse */}
      {showScrollHint && story.verses.length > 1 && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 animate-bounce-slow">
          <div className="bg-black/50 backdrop-blur-lg rounded-full px-4 py-2 text-white text-sm flex items-center gap-2">
            <i className="fas fa-chevron-down"></i> Scroll down for more verses
          </div>
        </div>
      )}
      
      {/* Fixed Header with glassmorphism */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-lg p-4 transition-opacity duration-500 ${!focusMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-center">
          <div className="text-white font-medium flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-${defaultTheme.accent} animate-pulse`}></div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {story.title} - Verse {currentVerseIndex + 1} of {story.verses.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-all"
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
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div ref={contentRef}>
          {story.verses.map((verse, index) => (
            <div 
              key={`verse-${verse.id}-${index}`}
              ref={el => verseRefs.current[index] = el}
              className="h-screen w-full snap-start flex flex-col relative transition-all duration-500 overflow-hidden"
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
                  
                  <div 
                    ref={momentsContainerRef}
                    className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {verse.moments.map((moment, momentIndex) => {
                      const imageUrl = getMomentImageUrl(moment);
                      const momentKey = moment && (moment.id || `moment-${momentIndex}`);
                      return (
                        <div key={momentKey} className="flex-shrink-0 w-full h-full snap-center moment-item">
                          {imageUrl ? (
                            <div className="relative w-full h-full">
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
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-2">
                    {verse.moments.map((_, momentIndex) => (
                      <div 
                        key={`indicator-${momentIndex}`}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${momentIndex === currentMomentIndex ? 'bg-white w-8' : 'bg-white/30'}`}
                      ></div>
                    ))}
                  </div>
                </div>
              ) : (
                /* If no moments, show verse content in the main area */
                <div className="flex-1 flex items-center justify-center bg-black/10 p-8 cursor-pointer" onClick={toggleFocusMode}>
                  <div className="text-white text-3xl text-center font-light max-w-3xl">
                    {verse.content || 'No content for this verse'}
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
                    {getAuthorProfileImageUrl() ? (
                      <img src={getAuthorProfileImageUrl()} alt={`${getAuthorDisplayName()}'s profile`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white">{getAuthorInitial()}</span>
                    )}
                  </div>
                </a>
              </div>

              <div className="text-white min-w-0">
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
            
            {/* Vertical buttons container */}
            <div className="absolute bottom-4 right-4 flex flex-col items-center gap-6 z-50">
              {/* Like Button (at top) */}
              <div className="flex flex-col items-center">
                <button 
                  className={`transition-all hover:scale-110 ${isLiked ? 'text-red-500' : 'text-white'}`}
                  onClick={handleLike}
                >
                  <div className="relative">
                    <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-2xl`}></i>
                    {isLiked && (
                      <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40"></div>
                    )}
                  </div>
                </button>
                <span className={`text-xs mt-1 ${isLiked ? 'text-red-500' : 'text-white'}`}>{likeCount}</span>
              </div>
              
              {/* Share Button (below like) */}
              <button 
                className="text-white transition-all hover:scale-110"
                onClick={handleShare}
              >
                <i className="fas fa-share text-2xl"></i>
              </button>
              
              {/* Save Button (below share) */}
              <div className="flex flex-col items-center">
                <button 
                  className={`transition-all hover:scale-110 ${isSaved ? 'text-yellow-500' : 'text-white'}`}
                  onClick={handleSave}
                >
                  <div className="relative">
                    <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-2xl`}></i>
                    {isSaved && (
                      <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-40"></div>
                    )}
                  </div>
                </button>
                <span className={`text-xs mt-1 ${isSaved ? 'text-yellow-500' : 'text-white'}`}>{saveCount}</span>
              </div>
              
              {/* Plus Button (at bottom) */}
              <button
                title="Contribute verse"
                onClick={handleOpenContribute}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
              >
                <i className="fas fa-plus"></i>
              </button>
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
              console.error('Error refreshing story data:', error);
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
        
        @keyframes bounce-slow {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-20px);
          }
          60% {
            transform: translateY(-10px);
          }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
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