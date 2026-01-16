"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { absoluteUrl, versesApi, userApi } from '../../../lib/api';
import ContributeModal from './storycard/ContributeModal';
import { useRouter } from 'next/navigation';
import ShareModal from './ShareModal';
import { createPortal } from 'react-dom';
import Image from 'next/image';

// Helper functions (previously in utils.js)
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

const getAuthor = (verse) => {
  return verse?.author || null;
};

const getAuthorDisplayName = (verse) => {
  const a = getAuthor(verse);
  if (!a) return 'Poster Name';

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

const getAuthorProfileImageUrl = (verse) => {
  const a = getAuthor(verse);
  if (!a) return null;
  if (a.profile_image_url) return absoluteUrl(a.profile_image_url);
  const maybe = a.profile_image || a.image || a.avatar || a.photo || a.picture || (a.profile && (a.profile.image || a.profile.avatar));
  if (!maybe) return null;
  if (typeof maybe === 'string') return absoluteUrl(maybe);
  if (maybe.url) return absoluteUrl(maybe.url);
  if (maybe.file_url) return absoluteUrl(maybe.file_url);
  return null;
};

const getAuthorInitial = (verse) => {
  const name = getAuthorDisplayName(verse) || getAuthorUsername(verse) || 'P';
  return (name && name.charAt && name.charAt(0).toUpperCase()) || 'P';
};

const getAuthorUsername = (verse) => {
  if (!verse) return null;
  const a = verse.author;
  if (!a) return verse.author_name || verse.author_username || null;
  if (typeof a === 'string') return a;
  if (a.username) return a.username;
  if (a.user && a.user.username) return a.user.username;
  if (a.profile && a.profile.username) return a.profile.username;
  return verse.author_name || verse.author_username || null;
};

const getUserId = (user) => {
  if (!user) return null;
  
  if (typeof user === 'number' || typeof user === 'string') {
    return user;
  }
  
  if (user.id !== undefined) {
    return user.id;
  }
  
  if (user.public_id !== undefined) {
    return user.public_id;
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

// VerseHeader Component (previously modular)
const VerseHeader = ({ 
  story, 
  currentVerseIndex, 
  onClose, 
  focusMode,
  hasMoments,
  currentMomentIndex,
  currentVerse
}) => {
  if (focusMode) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-400/20 p-4 transition-opacity duration-500 shadow-lg shadow-cyan-900/10">
      <div className="flex justify-between items-center">
        <div className="text-white font-medium flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 bg-clip-text text-transparent truncate block max-w-[60vw] font-bold tracking-wide drop-shadow-lg" title={`${story.title} - Verse ${currentVerseIndex + 1} of ${story.verses.length}`}>
            {story.title} <span className="opacity-60 font-normal">- Verse {currentVerseIndex + 1} of {story.verses.length}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4 mr-2">
          <div className="flex flex-col gap-0.5">
            {currentVerseIndex > 0 && (
              <div className="text-cyan-400 text-lg opacity-70 animate-pulse">↑</div>
            )}
            {currentVerseIndex < story.verses.length - 1 && (
              <div className="text-cyan-400 text-lg opacity-70 animate-pulse">↓</div>
            )}
          </div>
          
          {hasMoments && (
            <div className="flex gap-2">
              {currentMomentIndex > 0 && (
                <div className="text-purple-400 text-lg opacity-70 animate-pulse">←</div>
              )}
              {currentMomentIndex < currentVerse.moments.length - 1 && (
                <div className="text-purple-400 text-lg opacity-70 animate-pulse">→</div>
              )}
            </div>
          )}
        </div>
        
        <button 
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-all border border-cyan-400/20 shadow"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

// MomentsCarousel Component (previously modular)
const MomentsCarousel = ({ 
  moments, 
  currentMomentIndex, 
  setCurrentMomentIndex,
  toggleFocusMode,
  focusMode
}) => {
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const touchStartYRef = useRef(0);
  
  const hasMultipleMoments = moments && moments.length > 1;
  
  const handleMomentTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndRef.current = e.touches[0].clientX;
  };

  const handleMomentTouchMove = (e) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    touchEndRef.current = touch.clientX;
    
    const deltaX = Math.abs(touch.clientX - touchStartRef.current);
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
    
    if (deltaX > deltaY * 1.5 && deltaX > 5) {
      e.preventDefault();
    }
  };

  const handleMomentTouchEnd = (e) => {
    const start = touchStartRef.current;
    const end = touchEndRef.current;
    
    if (!start || !end || start === end) return;
    
    const deltaX = start - end;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY * 1.5) {
      if (deltaX > 0) {
        goToNextMoment();
      } else {
        goToPreviousMoment();
      }
    }
  };

  const goToPreviousMoment = () => {
    if (currentMomentIndex <= 0) return;
    setCurrentMomentIndex(prev => prev - 1);
  };

  const goToNextMoment = () => {
    if (!moments || currentMomentIndex >= moments.length - 1) return;
    setCurrentMomentIndex(prev => prev + 1);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/10 cursor-pointer relative" onClick={toggleFocusMode}>
      {!focusMode && hasMultipleMoments && currentMomentIndex > 0 && (
        <button 
          className="absolute left-4 z-10 bg-black/50 backdrop-blur-lg rounded-full p-3 animate-pulse hover:bg-black/70 transition-all"
          style={{ top: '28%' }}
          onClick={(e) => {
            e.stopPropagation();
            goToPreviousMoment();
          }}
        >
          <i className="fas fa-chevron-left text-white"></i>
        </button>
      )}
      
      {!focusMode && hasMultipleMoments && currentMomentIndex < moments.length - 1 && (
        <button 
          className="absolute right-4 z-10 bg-black/50 backdrop-blur-lg rounded-full p-3 animate-pulse hover:bg-black/70 transition-all"
          style={{ top: '28%' }}
          onClick={(e) => {
            e.stopPropagation();
            goToNextMoment();
          }}
        >
          <i className="fas fa-chevron-right text-white"></i>
        </button>
      )}
      
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleMomentTouchStart}
        onTouchMove={handleMomentTouchMove}
        onTouchEnd={handleMomentTouchEnd}
      >
        {moments.map((moment, momentIndex) => {
          const imageUrl = getMomentImageUrl(moment);
          const momentKey = moment && (moment.id || `moment-${momentIndex}`);
          return (
            <div 
              key={momentKey} 
              className={`absolute inset-0 transition-opacity duration-300 ${momentIndex === currentMomentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {imageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={imageUrl}
                    alt={`Verse moment ${momentIndex + 1}`}
                    width={1080}
                    height={1440}
                    className="max-w-full max-h-full object-contain mx-auto my-auto"
                    quality={75}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
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
      
      {!focusMode && (
        <div className="absolute bottom-48 left-0 right-0 flex justify-center space-x-2 z-[9999]">
          {moments.map((_, momentIndex) => (
            <div 
              key={`indicator-${momentIndex}`}
              className={`w-2 h-2 rounded-full transition-all duration-300 shadow-lg ${momentIndex === currentMomentIndex ? 'bg-white w-8' : 'bg-white/30'}`}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

// VerseContent Component (previously modular)
const VerseContent = ({ 
  content, 
  fontSize, 
  setFontSize, 
  toggleFocusMode 
}) => {
  return (
    <div className="w-full h-full flex justify-center bg-black/10 cursor-pointer relative" onClick={toggleFocusMode}>
      <div className="absolute top-20 right-3 z-20 flex flex-row gap-2 items-end">
        <button
          className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-200/50 to-blue-500/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-cyan-400/40 text-2xl font-bold"
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
      <div className="w-full max-w-3xl h-full relative">
        <div className="overflow-y-auto px-6 py-8" style={{ maxHeight: 'calc(100vh - 160px)', minHeight: '120px', marginTop: '64px', marginBottom: '80px' }}>
          <div className="text-white font-light" style={{ whiteSpace: 'pre-line', textAlign: 'left', fontSize: fontSize, transition: 'font-size 0.2s' }}>
            {content || 'No content for this verse'}
          </div>
        </div>
      </div>
    </div>
  );
};

// VerseFooter Component (previously modular)
const VerseFooter = ({ 
  story, 
  currentVerse, 
  isLiked, 
  isSaved, 
  likeCount, 
  saveCount, 
  isLikeLoading, 
  isSaveLoading,
  handleLike, 
  handleSave, 
  handleShare, 
  handleOpenContribute,
  isAuthenticated,
  currentUser,
  openAuthModal,
  isFollowing,
  setIsFollowing,
  focusMode,
  showVerseOptions,
  setShowVerseOptions,
  isContribution
}) => {
  const router = useRouter();
  
  if (focusMode) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/60 backdrop-blur-lg to-transparent p-4">
      <div className="flex justify-between items-center max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: '3rem', height: '3rem' }}>
            <a
              href={`/${encodeURIComponent(getAuthorUsername(currentVerse) || '')}`}
              className="block w-full h-full"
              onClick={(e) => {
                e.preventDefault();
                const u = getAuthorUsername(currentVerse);
                if (u) router.push(`/${encodeURIComponent(u)}`);
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer overflow-hidden">
                {getAuthorProfileImageUrl(currentVerse) ? (
                  <Image 
                    src={getAuthorProfileImageUrl(currentVerse)} 
                    alt={`${getAuthorDisplayName(currentVerse)}'s profile`} 
                    width={80}
                    height={80}
                    className="w-full h-full object-cover" 
                    quality={75}
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentNode.querySelector('.author-initial-fallback');
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <span className="text-white author-initial-fallback" style={{display: getAuthorProfileImageUrl(currentVerse) ? 'none' : 'block'}}>
                  {getAuthorInitial(currentVerse)}
                </span>
              </div>
            </a>
            
            {getAuthorUsername(currentVerse) && getAuthorUsername(currentVerse) !== 'anonymous' && !isFollowing && 
             String(getUserId(currentVerse?.author || story?.creator || '')) !== String(currentUser?.public_id) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const username = getAuthorUsername(currentVerse);
                  setIsFollowing(true);
                  if (!isAuthenticated) {
                    if (typeof openAuthModal === 'function') openAuthModal('follow', username);
                    return;
                  }
                  // Follow API call would go here
                }}
                className="follow-button absolute bottom-0 right-0 rounded-full flex items-center justify-center shadow-lg transition-all hover:bg-blue-600 bg-transparent border-2 border-white w-6 h-6"
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
                href={`/${encodeURIComponent(getAuthorUsername(currentVerse) || '')}`}
                className="block min-w-0"
                onClick={(e) => {
                  e.preventDefault();
                  const u = getAuthorUsername(currentVerse);
                  if (u) router.push(`/${encodeURIComponent(u)}`);
                }}
              >
                <span className="font-semibold text-sm truncate block max-w-[18rem]" title={getAuthorDisplayName(currentVerse)}>
                  {getAuthorDisplayName(currentVerse)}
                </span>
              </a>
              <div className={`text-xs ${isContribution ? 'text-orange-400' : 'text-cyan-300'}`}>
                {isContribution ? 'Contributed' : 'Creator'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-4 right-4 flex flex-col items-center gap-6 z-50">
          {isAuthenticated && currentUser && (() => {
            const currentUserId = String(currentUser?.public_id || currentUser?.id);
            const verseAuthorId = String(getUserId(currentVerse?.author) || '');
            const storyCreatorId = String(getUserId(story?.creator) || '');
            return currentUserId && (currentUserId === verseAuthorId || currentUserId === storyCreatorId);
          })() && (
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
            </div>
          )}

          <div className="flex flex-col items-center">
            <button 
              className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative ${isLiked ? 'bg-accent-orange/10 border-2 border-accent-orange' : 'border border-white/20'} hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110 ${isLikeLoading ? 'transition-none' : 'transition-all duration-200 ease-in-out'}`}
              onClick={handleLike}
              disabled={isLikeLoading}
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
          
          <button 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-white/20 hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110"
            onClick={handleShare}
          >
            <i className="fas fa-share text-[18px] text-white"></i>
          </button>
          
          <div className="flex flex-col items-center">
            <button 
              className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative ${isSaved ? 'bg-accent-orange/10 border-2 border-accent-orange' : 'border border-white/20'} hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110 ${isSaveLoading ? 'transition-none' : 'transition-all duration-200 ease-in-out'}`}
              onClick={handleSave}
              disabled={isSaveLoading}
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
          
          {story.allow_contributions ? (
            <button
              title="Contribute verse"
              onClick={handleOpenContribute}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 relative group"
              style={{ 
                background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', 
                border: '3px solid #ff6b35', 
                boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                animation: 'pulse 2s infinite'
              }}
            >
              <i className="fas fa-users text-white text-2xl font-bold relative z-10"></i>
            </button>
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-700/40 text-gray-400 cursor-not-allowed relative group border-4 border-gray-400/20 shadow-xl"
              title="Contributions are disabled for this story."
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
  );
};

// Main VerseViewer Component
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
    if (story && Array.isArray(story.verses)) {
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
      // Ensure storyRef is always set to something to prevent undefined errors
      storyRef.current = story || { verses: [] };
    }
    
    // 🔥 CACHE INITIALIZATION: Initialize cache for all verses in the story
    if (story?.verses && Array.isArray(story.verses)) {
      story.verses.forEach((verse, index) => {
        if (verse && verse.id && !verseMetadataRef.current[verse.id]) {
          verseMetadataRef.current[verse.id] = {
            is_liked_by_user: verse.user_has_liked || verse.is_liked_by_user || false,
            is_saved_by_user: verse.user_has_saved || verse.is_saved_by_user || false,
            likes_count: verse.likes_count || 0,
            saves_count: verse.saves_count || 0
          };
        }
      });
    }
  }, [story]);

  const currentVerse = useMemo(() => {
    const verses = storyRef.current?.verses;
    if (!verses || !Array.isArray(verses) || currentVerseIndex >= verses.length) {
      return null;
    }
    return verses[currentVerseIndex];
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
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
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
    if (currentVerse && currentVerse.id) {
      // First try to get from cache
      const cachedMetadata = verseMetadataRef.current[currentVerse.id];
      
      if (cachedMetadata) {
        setIsLiked(cachedMetadata.is_liked_by_user);
        setIsSaved(cachedMetadata.is_saved_by_user);
        setLikeCount(cachedMetadata.likes_count);
        setSaveCount(cachedMetadata.saves_count);
      } else {
        // Fall back to verse object data
        const initial = getVerseInitialState(currentVerse);
        setIsLiked(initial.isLiked);
        setIsSaved(initial.isSaved);
        setLikeCount(initial.likeCount);
        setSaveCount(initial.saveCount);
      }
      
      setCurrentMomentIndex(0);
      setIsContentExpanded(false);
      setIsTextVisible(true);
    }
  }, [currentVerse?.id, currentVerseIndex]);



  // Effect for scroll indicator
  useEffect(() => {
    if (!isOpen || !story?.verses || story.verses.length <= 1) {
      setShowScrollIndicator(false);
      return;
    }

    if (currentVerseIndex >= story.verses.length - 1) {
      setShowScrollIndicator(false);
      return;
    }

    const showTimer = setTimeout(() => {
      setShowScrollIndicator(true);
    }, 1000);

    const hideTimer = setTimeout(() => {
      setShowScrollIndicator(false);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isOpen, story?.verses, currentVerseIndex]);

  // Effect for updating reading progress on scroll
  useEffect(() => {
    const handleScroll = () => {
      userScrolledRef.current = true;
      setShowScrollIndicator(false);
      
      // Calculate reading progress
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        const scrollHeight = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        setReadingProgress(Math.min(progress, 100));
      }
    };

    const containerElement = containerRef.current;
    if (containerElement && isOpen) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => {
        containerElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen]);



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
      
      // Calculate initial reading progress based on which verse we're viewing
      if (story?.verses && story.verses.length > 0) {
        const initialVerse = story.verses[initialVerseIndex] || story.verses[0];
        if (initialVerse) {
          const initial = getVerseInitialState(initialVerse);
          setIsLiked(initial.isLiked);
          setLikeCount(initial.likeCount);
          setIsSaved(initial.isSaved);
          setSaveCount(initial.saveCount);
        }
        
        // Set initial progress based on verse index
        const progress = ((initialVerseIndex + 1) / story.verses.length) * 100;
        setReadingProgress(progress);
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
  }, [currentVerseIndex]);

  // Action handlers
  const handleLike = async () => {
    if (!currentVerse) return;
    
    let verseSlug = currentVerse.slug;
    if (!verseSlug && currentVerse.id) {
      const verseInStory = storyRef.current?.verses?.find(v => v.id === currentVerse.id);
      verseSlug = verseInStory?.slug;
    }
    
    if (!verseSlug) {
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

      const finalIsLiked = response.is_liked_by_user !== undefined ? response.is_liked_by_user : (response.user_has_liked !== undefined ? response.user_has_liked : !wasLiked);
      const finalLikeCount = response.likes_count !== undefined ? response.likes_count : likeCount;

      setIsLiked(finalIsLiked);
      setLikeCount(finalLikeCount);

      // 🔥 UPDATE CACHE: Keep verse metadata cache in sync
      // Make sure we're updating the EXACT verse by ID
      if (verseMetadataRef.current[currentVerse.id]) {
        verseMetadataRef.current[currentVerse.id].is_liked_by_user = finalIsLiked;
        verseMetadataRef.current[currentVerse.id].likes_count = finalLikeCount;
      } else {
        verseMetadataRef.current[currentVerse.id] = {
          is_liked_by_user: finalIsLiked,
          is_saved_by_user: isSaved,
          likes_count: finalLikeCount,
          saves_count: saveCount
        };
      }

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

      const finalIsSaved = response.is_saved_by_user !== undefined ? response.is_saved_by_user : (response.user_has_saved !== undefined ? response.user_has_saved : !wasSaved);
      const finalSaveCount = response.saves_count !== undefined ? response.saves_count : saveCount;

      setIsSaved(finalIsSaved);
      setSaveCount(finalSaveCount);

      // 🔥 UPDATE CACHE: Keep verse metadata cache in sync
      // Make sure we're updating the EXACT verse by ID
      if (verseMetadataRef.current[currentVerse.id]) {
        verseMetadataRef.current[currentVerse.id].is_saved_by_user = finalIsSaved;
        verseMetadataRef.current[currentVerse.id].saves_count = finalSaveCount;
      } else {
        verseMetadataRef.current[currentVerse.id] = {
          is_liked_by_user: isLiked,
          is_saved_by_user: finalIsSaved,
          likes_count: likeCount,
          saves_count: finalSaveCount
        };
      }

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

  // FIX: Return null if story or verses are not available
  if (!isOpen || !story || !story.verses || story.verses.length === 0) {
    return null;
  }

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
      <div className="fixed top-0 left-0 right-0 h-2 z-[99999] bg-black/30 pointer-events-none rounded-b-2xl">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 transition-all duration-300 ease-out rounded-b-2xl shadow-lg shadow-cyan-400/20"
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>

      {/* Scroll down indicator */}
      {showScrollIndicator && story?.verses && story.verses.length > 1 && currentVerseIndex < story.verses.length - 1 && (
        <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="animate-bounce">
            <i className="fas fa-chevron-down text-5xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse drop-shadow-lg"></i>
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
        <div className="fixed bottom-20 left-0 right-0 z-40 bg-gradient-to-t from-black/60 backdrop-blur-lg to-transparent p-2">
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