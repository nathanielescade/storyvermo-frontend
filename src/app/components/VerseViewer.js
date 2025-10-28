'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { absoluteUrl, versesApi } from '../../../lib/api';
import ContributeModal from './storycard/ContributeModal';

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
  initialVerseIndex = 0 
}) => {
  const { currentUser } = useAuth();
  const [currentVerseIndex, setCurrentVerseIndex] = useState(initialVerseIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
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
  
  // Get current verse
  const currentVerse = story?.verses?.[currentVerseIndex] || null;
  
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
  
  // Initialize verse data
  useEffect(() => {
    if (currentVerse) {
      setIsLiked(currentVerse.user_has_liked || currentVerse.is_liked_by_user || false);
      setIsSaved(currentVerse.user_has_saved || currentVerse.is_saved_by_user || false);
      setLikeCount(currentVerse.likes_count || 0);
      setSaveCount(currentVerse.saves_count || 0);
      setCurrentMomentIndex(0);
      setIsContentExpanded(false);
      setIsTextVisible(true);
    }
  }, [currentVerse]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentVerseIndex(initialVerseIndex);
      setIsContentExpanded(false);
      setFocusMode(false);
      setIsTextVisible(true);
      setShowScrollHint(true);
      
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

  // Handle scroll events to detect current verse (throttled)
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Determine which verse is currently in view
      for (let i = 0; i < verseRefs.current.length; i++) {
        const verse = verseRefs.current[i];
        if (verse) {
          const verseTop = verse.offsetTop;
          
          // Check if this verse is the most visible one
          if (scrollTop >= verseTop - 100 && scrollTop < verseTop + 100) {
            if (currentVerseIndex !== i) {
              setIsTransitioning(true);
              setCurrentVerseIndex(i);
              
              // Snap to the exact position of this verse
              setTimeout(() => {
                if (containerRef.current) {
                  smoothScroll(containerRef, verseTop, 300);
                }
                setIsTransitioning(false);
              }, 50);
            }
            break;
          }
        }
      }
    }, 50);

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => containerElement.removeEventListener('scroll', handleScroll);
    }
  }, [currentVerseIndex]);

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

  // Handle like action with optimistic UI
  const handleLike = async () => {
    if (!currentVerse || !currentVerse.slug) return;
    
    // Optimistic UI update
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? likeCount + 1 : Math.max(0, likeCount - 1);
    
    setIsLiked(newLikedState);
    setLikeCount(newLikeCount);
    
    try {
      // Fixed: Use the correct API endpoint format
      const response = await versesApi.toggleLikeBySlug(currentVerse.slug);
      
      // Update with server response
      setIsLiked(response.is_liked_by_user);
      setLikeCount(response.likes_count);
      
      // Update verse in story if needed
      if (story && story.verses) {
        const updatedVerses = [...story.verses];
        const verseIndex = updatedVerses.findIndex(v => v.id === currentVerse.id);
        if (verseIndex !== -1) {
          updatedVerses[verseIndex] = {
            ...updatedVerses[verseIndex],
            likes_count: response.likes_count,
            is_liked_by_user: response.is_liked_by_user
          };
          // Update story state if needed
        }
      }
      
    } catch (error) {
      // Revert on error
      setIsLiked(!newLikedState);
      setLikeCount(likeCount);
      console.error('Error toggling verse like:', error);
    }
  };

  // Handle save action with optimistic UI
  const handleSave = async () => {
    if (!currentVerse || !currentVerse.slug) return;
    
    // Optimistic UI update
    const newSavedState = !isSaved;
    const newSaveCount = newSavedState ? saveCount + 1 : Math.max(0, saveCount - 1);
    
    setIsSaved(newSavedState);
    setSaveCount(newSaveCount);
    
    try {
      const response = await versesApi.toggleSaveBySlug(currentVerse.slug);
      
      // Update with server response
      setIsSaved(response.is_saved_by_user);
      setSaveCount(response.saves_count);
      
      // Update verse in story if needed
      if (story && story.verses) {
        const updatedVerses = [...story.verses];
        const verseIndex = updatedVerses.findIndex(v => v.id === currentVerse.id);
        if (verseIndex !== -1) {
          updatedVerses[verseIndex] = {
            ...updatedVerses[verseIndex],
            saves_count: response.saves_count,
            is_saved_by_user: response.is_saved_by_user,
            user_has_saved: response.is_saved_by_user 
          };
          // Update story state if needed
        }
      }
      
    } catch (error) {
      // Revert on error
      setIsSaved(!newSavedState);
      setSaveCount(saveCount);
      console.error('Error toggling verse save:', error);
    }
  };

  // Handle share action
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: story?.title || 'Verse',
        text: currentVerse?.content || 'Check out this verse',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Handle opening contribute modal
  const handleOpenContribute = () => {
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

  return (
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
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center font-bold text-lg text-white shadow-lg">
                {currentVerse?.author?.username?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="text-white">
                <div className="font-semibold">{currentVerse?.author?.username || 'Poster Name'}</div>
                {/* Updated to show "Contributed" tag only for actual contributed verses */}
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
};

export default VerseViewer;