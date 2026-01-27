"use client";
// StoryCard.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';
import LazyImage from './LazyImage';
import { formatNumber, formatTimeAgo, createBubbles } from '../../../lib/utils';
import { absoluteUrl, storiesApi, userApi } from '../../../lib/api';

// Import modular components
import HologramIcons from './storycard/HologramIcons';
import TitleSection from './storycard/TitleSection';
import TagsSection from './storycard/TagsSection';
import ActionButtons from './storycard/ActionButtons';
import CreatorChip from './storycard/CreatorChip';
import dynamic from 'next/dynamic';

const ContributeModal = dynamic(() => import('./storycard/ContributeModal'), { ssr: false });
const StoryFormModal = dynamic(() => import('./StoryFormModal'), { ssr: false });

import RecommendModal from './storycard/RecommendModal';
import EnlargeModal from './storycard/EnlargeModal';
import DeleteModal from './storycard/DeleteModal';
import DropdownMenu from './storycard/DropdownModal';
import VerseViewer from './VerseViewer';
import ShareModal from './ShareModal';
import CommentModal from './CommentModal';


function StoryCardInner({ 
    story, 
    index, 
    viewType = 'feed',
    onFollowUser,
    onOpenStoryVerses,
    onDeleteStory,
    currentTag,
    onTagSelect,
    isAuthenticated,
    openAuthModal,
    onStoryUpdate // New prop from FeedClient
}) {
    const { currentUser } = useAuth();
    const [isFollowing, setIsFollowing] = useState(story.isFollowing || story.is_following || false);
    const [titleExpanded, setTitleExpanded] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);
    const [isDescTruncated, setIsDescTruncated] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showVerseViewer, setShowVerseViewer] = useState(false);
    const [isViewerOpening, setIsViewerOpening] = useState(false);
    const [verseLoaderProgress, setVerseLoaderProgress] = useState(0);
    const [showVerseLoader, setShowVerseLoader] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState(story.comments_count || 0);
    const [fullStoryForViewer, setFullStoryForViewer] = useState(story); // Store full story data for VerseViewer
    
    // Hologram icon modals
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [showRecommendModal, setShowRecommendModal] = useState(false);
    const [showEnlargeModal, setShowEnlargeModal] = useState(false);
    const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownCoords, setDropdownCoords] = useState(null);
    
    // Story form modal
    const [showStoryFormModal, setShowStoryFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [storyDeleted, setStoryDeleted] = useState(false);
    const [editingVerseForModal, setEditingVerseForModal] = useState(null);
    
    const cardRef = useRef(null);
    const hologramRef = useRef(null);
    const dropdownRef = useRef(null);
    const [bubblesCreated, setBubblesCreated] = useState(false);
    const observerRef = useRef(null);

    // 🚀 PERFORMANCE FIX: Only create bubbles when card is visible in viewport
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const node = hologramRef.current;
        if (!node) return;

        // Use Intersection Observer to lazily create bubbles only when visible
        observerRef.current = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && !bubblesCreated) {
                    // Card is visible - create bubbles
                    const existingBubbles = node.querySelectorAll('.bubble');
                    existingBubbles.forEach(bubble => bubble.remove());
                    
                    const hologramId = `hologram-${story.id || Math.random().toString(36).substr(2, 9)}`;
                    node.id = hologramId;
                    createBubbles(hologramId);
                    setBubblesCreated(true);
                } else if (!entry.isIntersecting && bubblesCreated) {
                    // Card is not visible - remove bubbles to save resources
                    const existingBubbles = node.querySelectorAll('.bubble');
                    existingBubbles.forEach(bubble => bubble.remove());
                    setBubblesCreated(false);
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        observerRef.current.observe(node);

        return () => {
            if (observerRef.current && node) {
                observerRef.current.unobserve(node);
            }
            // Cleanup bubbles
            const bubbles = node.querySelectorAll('.bubble');
            bubbles.forEach(bubble => bubble.remove());
        };
    }, [story.id, bubblesCreated]);

    // Update following state when story changes
    useEffect(() => {
        if (!story) return;
        
        const followingValue = story.isFollowing || story.is_following || false;
        setIsFollowing(followingValue);
        setLocalCommentsCount(story.comments_count || 0);
    }, [story]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
                setDropdownCoords(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Trigger a short burst of extra bubbles in the hologram (e.g., when user likes)
    const triggerLikeBurst = useCallback(() => {
        const node = hologramRef.current;
        if (!node) return;

        const burstCount = 12;
        const created = [];

        for (let i = 0; i < burstCount; i++) {
            const heart = document.createElement('div');
            heart.className = 'like-burst-heart';
            
            const size = Math.random() * 10 + 8; // 8-18px (smaller)
            heart.style.fontSize = `${size}px`;
            heart.innerHTML = '<i class="fas fa-heart"></i>';
            
            // Use varied colors for each heart
            const colors = ['#ff6b35', '#ff0080', '#00d4ff', '#9d00ff', '#ff6b35'];
            heart.style.color = colors[Math.floor(Math.random() * colors.length)];

            // Position near the like icon (left side of hologram) with some spread
            const left = 10 + Math.random() * 15; // 10-25% (near left where like icon is)
            const top = 30 + Math.random() * 40; // 30-70% (vertically centered)
            heart.style.position = 'absolute';
            heart.style.left = `${left}%`;
            heart.style.top = `${top}%`;
            heart.style.pointerEvents = 'none';
            heart.style.zIndex = '1';

            // Short, snappy animation so they disappear quickly
            const duration = (Math.random() * 0.8) + 0.8; // ~0.8 - 1.6s
            const delay = Math.random() * 0.12;
            heart.style.animation = `bubble-float ${duration}s ease-out ${delay}s forwards`;

            node.appendChild(heart);
            created.push(heart);
        }

        // Remove them after ~2s
        setTimeout(() => {
            created.forEach(h => h && h.remove());
        }, 2000);
    }, []);

    // Check if current user is the owner of the story
    const isOwner = useMemo(() => {
        if (!currentUser || !story) return false;
  
        const cuUsername = currentUser.username || '';
        const cuId = currentUser.id || currentUser.pk || currentUser.user_id || '';

        // If serializer provided a direct username field
        if (story.creator_username && cuUsername && story.creator_username === cuUsername) return true;

        // If serializer provided a numeric id field
        if (story.creator_id && cuId && String(story.creator_id) === String(cuId)) return true;

        // If story.creator is a plain string (username) or numeric id
        if (typeof story.creator === 'string') {
            if (cuUsername && story.creator === cuUsername) return true;
            if (cuId && String(story.creator) === String(cuId)) return true;
        }

        // If story.creator is an object, check common fields
        if (typeof story.creator === 'object' && story.creator) {
            const c = story.creator;
            if (c.username && cuUsername && c.username === cuUsername) return true;
            if ((c.id || c.pk || c.user_id) && cuId && String(c.id || c.pk || c.user_id) === String(cuId)) return true;
        }

        // Fallback: check top-level creator_user / creator_username style fields
        if (story.creator_user && cuUsername && story.creator_user === cuUsername) return true;

        return false;
    }, [currentUser, story]);

    // StoryCard.js - handleFollow function
    const handleFollow = async (event, username) => {
        event.stopPropagation();

        if (!isAuthenticated) {
            openAuthModal('follow', username);
            return;
        }

        try {
            // If a parent handler is provided, delegate to it
            if (typeof onFollowUser === 'function') {
                // Optimistically update isFollowing immediately
                setIsFollowing(prev => !prev);
                
                try {
                    await onFollowUser(username);
                } catch (error) {
                    // If parent call fails, revert the optimistic update
                    setIsFollowing(prev => !prev);
                    throw error;
                }
                return;
            }

            // Fallback: perform the API call locally when no parent handler exists
            const response = await userApi.followUser(username);
            setIsFollowing(response.is_following);
            
            // Notify parent about the story update
            if (onStoryUpdate) {
                onStoryUpdate({
                    ...story,
                    is_following: response.is_following
                });
            }
        } catch (error) {
            console.error("Follow error:", error);
        }
    };

    const handleOpenVerses = useCallback(async () => {
        try {
            // 🔗 SEO-FRIENDLY URL: Update URL without navigation (modal stays open)
            // This ensures the URL is SEO-friendly while keeping the UX smooth
            const verses = fullStoryForViewer?.verses || story?.verses || [];
            if (verses.length > 0) {
                const firstVerseId = verses[0].id || verses[0].public_id;
                const verseUrl = `/stories/${encodeURIComponent(story.slug)}/?verse=${encodeURIComponent(firstVerseId)}`;
                
                if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                    window.history.pushState(
                        { modalOpen: 'verses', storySlug: story.slug },
                        '',
                        verseUrl
                    );
                }
            } else {
                // No verses yet, but still open the viewer with empty state
                if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                    window.history.pushState(
                        { modalOpen: 'verses', storySlug: story.slug },
                        '',
                        `/stories/${encodeURIComponent(story.slug)}/`
                    );
                }
            }
            
            // Show loader and start progress animation
            setShowVerseLoader(true);
            setVerseLoaderProgress(0);
            setIsViewerOpening(true);
            
            // Animate progress from 0 to 100% over 1 second
            const startTime = Date.now();
            const duration = 1000; // 1 second
            
            const progressInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / duration) * 100, 100);
                setVerseLoaderProgress(progress);
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                }
            }, 16); // ~60fps updates
            
            // Open viewer after 1 second (when loader reaches 100%)
            setTimeout(() => {
                setShowVerseViewer(true);
                setShowVerseLoader(false);
                setVerseLoaderProgress(0);
            }, duration);
            
            // Fetch fresh story data in BACKGROUND without blocking the UI
            try {
                const fullStory = await storiesApi.getStoryBySlug(story.slug);
                
                // Update the story in parent's state with full data
                if (onStoryUpdate) {
                    onStoryUpdate(fullStory);
                }
                
                // Update state with full story for VerseViewer to use
                setFullStoryForViewer(fullStory);
            } catch (fetchError) {
                console.error("Error fetching full story data:", fetchError);
                // Keep viewer open with existing data - don't block on fetch error
            } finally {
                setIsViewerOpening(false);
            }
        } catch (e) {
            console.error("Error opening verses:", e);
            setIsViewerOpening(false);
            setShowVerseLoader(false);
            setVerseLoaderProgress(0);
        }
    }, [story.slug, story.verses, fullStoryForViewer, onStoryUpdate]);

    const handleDeleteStory = async () => {
        setShowDeleteModal(false);
        const slug = story.slug;
        if (!slug) {
            alert('Cannot delete story: missing slug/identifier.');
            setShowDropdown(false);
            setDropdownCoords(null);
            return;
        }

        try {
            setIsDeleting(true);
            await storiesApi.deleteStory(slug);
            setShowDropdown(false);
            setDropdownCoords(null);
            setStoryDeleted(true);
            
            if (cardRef.current) {
                cardRef.current.style.transition = 'all 0.5s ease-out';
                cardRef.current.style.opacity = '0';
                cardRef.current.style.transform = 'translateY(-20px)';
            }
            
            setTimeout(() => {
                // Show success notification
                try {
                  const event = new CustomEvent('notification:show', {
                    detail: {
                      message: 'Your story has been deleted successfully',
                      type: 'success',
                      duration: 3000
                    }
                  });
                  window.dispatchEvent(event);
                } catch (e) { /* notification failed */ }
                
                if (typeof onDeleteStory === 'function') {
                    try { onDeleteStory(slug); } catch (e) { /* onDeleteStory callback failed */ }
                }
            }, 500);
        } catch (err) {
            console.error("Delete error:", err);
            // Show error notification
            try {
              const event = new CustomEvent('notification:show', {
                detail: {
                  message: `Failed to delete story: ${err.message || err}`,
                  type: 'error',
                  duration: 4000
                }
              });
              window.dispatchEvent(event);
            } catch (e) { /* notification failed */ }
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper functions
    const getCreatorDisplayName = () => {
        // Check if account is brand type and has brand_name
        if (story && story.creator_account_type === 'brand' && story.creator_brand_name) {
            return story.creator_brand_name;
        }

        // Check if creator object has account_type and brand_name
        if (story && typeof story.creator === 'object' && story.creator) {
            if (story.creator.account_type === 'brand' && story.creator.brand_name) {
                return story.creator.brand_name;
            }
        }

        // Prefer serializer-provided consolidated/full name fields
        if (story && story.creator_full_name) return story.creator_full_name;
        if (story && (story.creator_first_name || story.creator_last_name)) {
            return `${story.creator_first_name || ''}${story.creator_first_name && story.creator_last_name ? ' ' : ''}${story.creator_last_name || ''}`.trim();
        }

        // If creator is a string (username), return it
        if (story && typeof story.creator === 'string') return story.creator;

        // If creator is an object, try common fields
        if (story && typeof story.creator === 'object' && story.creator) {
            if (story.creator.first_name || story.creator.last_name) {
                return `${story.creator.first_name || ''}${story.creator.first_name && story.creator.last_name ? ' ' : ''}${story.creator.last_name || ''}`.trim();
            }
            if (story.creator.name) return story.creator.name;
            if (story.creator.username) return story.creator.username;
        }

        // Fallbacks
        if (story && story.creator_username) return story.creator_username;
        return 'unknown';
    };

    const getCreatorUsername = () => {
        // Prefer serializer-provided username field
        if (story && story.creator_username) return story.creator_username;
        if (story && typeof story.creator === 'string') return story.creator;
        if (story && typeof story.creator === 'object' && story.creator) {
            return story.creator.username || story.creator.id || String(story.creator.id || '') || 'anonymous';
        }
        return 'anonymous';
    };

    const getCreatorProfileImage = () => {
        // Prefer top-level serializer field
        if (story && story.creator_profile_image) return story.creator_profile_image;
        if (typeof story.creator === 'object' && story.creator) {
            return story.creator.profile_image || story.creator.avatar || null;
        }
        return null;
    };

    const getCoverImageUrl = () => {
        if (!story) return null;
        const cov = story.cover_image;
        if (!cov) return null;
        
        // Handle string URLs
        if (typeof cov === 'string') {
            return cov ? absoluteUrl(cov) : null;
        }
        
        // Handle object URLs
        const url = cov.file_url || cov.url || '';
        return url ? absoluteUrl(url) : null;
    };

    const getFirstVerseImage = () => {
        if (!story || !Array.isArray(story.verses)) return null;
        const v = story.verses[0];
        if (!v) return null;
        if (Array.isArray(v.images) && v.images.length > 0) {
            const img = v.images[0];
            return img ? absoluteUrl(img) : null;
        }
        return null;
    };

    const getCreatorProfileImageUrl = () => {
        const img = getCreatorProfileImage();
        return img ? absoluteUrl(img) : null;
    };

    const getCreatorInitial = () => {
        const name = getCreatorDisplayName();
        return name.charAt(0);
    };

    const getTagName = (tag) => {
        if (typeof tag === 'string') return tag;
        return tag.name || tag.slug || tag.id || 'tag';
    };

    const getTagId = (tag) => {
        if (typeof tag === 'string') return tag;
        return tag.id || tag.slug || tag.name;
    };

    // Share data (guard window for SSR)
    const _origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const shareData = {
        title: story.title || 'StoryVermo',
        description: story.description || 'Check out this story on StoryVermo',
        url: _origin ? `${_origin}/stories/${story.slug}/` : `/stories/${story.slug}/`
    };

    if (viewType === 'feed') {
        const coverImageUrl = getCoverImageUrl();
        const creatorUsername = getCreatorUsername();
        
        return (
            <div className="image-container" style={{ display: storyDeleted ? 'none' : 'block' }}>
                <div 
                    ref={cardRef} 
                    className="scene-card " 
                    style={{ 
                        transition: 'transform 0.2s ease',
                        perspective: '1000px',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        position: 'relative',
                        touchAction: 'auto',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                    }}
                    data-story-id={story.id} 
                    data-creator={creatorUsername} 
                    data-story-slug={story.slug || ''}
                >
                    {coverImageUrl ? (
                        <div className="relative w-full h-full">
                            {index === 0 ? (
                                <Image
                                    src={coverImageUrl}
                                    alt={story.title || 'Story cover'}
                                    fill
                                    className="scene-bg w-full h-full"
                                    quality={60}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                                    priority
                                    fetchPriority="high"
                                    loading="eager"
                                />
                            ) : (
                                <LazyImage
                                    src={coverImageUrl}
                                    alt={story.title || 'Story cover'}
                                    fill
                                    className="scene-bg w-full h-full"
                                    quality={60}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                                />
                            )}
                        </div>
                    ) : null}
                    <div className="scene-overlay"></div>
                    
                    <div 
                        ref={hologramRef}
                        className={`fixed-hologram absolute bottom-36 left-[5%] right-[5%] bg-black/60 backdrop-blur-[0.5px] rounded-2xl p-3 overflow-visible shadow-2xl ${story.featured ? 'border-l-4 border-l-amber-400 border-3 border-amber-400/40 shadow-amber-500/40' : 'border-3 border-[rgba(0,212,255,0.5)] shadow-blue-500/40'}`}
                        style={{
                            position: 'absolute',
                            transform: 'translateZ(0)',
                            willChange: 'transform',
                            userSelect: 'none'
                        }}
                    >
                        {/* Featured Crown Icon */}
                        {story.featured && (
                            <div className="absolute left-4 z-20" style={{top: '-14px'}}>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/50 border border-amber-200/80">
                                    <i className="fas fa-crown text-white text-xs drop-shadow-lg"></i>
                                </div>
                            </div>
                        )}
                        
                        <HologramIcons 
                            story={story}
                            isOwner={isOwner}
                            isAuthenticated={isAuthenticated}
                            openAuthModal={openAuthModal}
                            setShowContributeModal={setShowContributeModal}
                            setShowRecommendModal={setShowRecommendModal}
                            setShowEnlargeModal={setShowEnlargeModal}
                            onOpenDropdown={(btnEl) => {
                                try {
                                    if (!btnEl || typeof btnEl.getBoundingClientRect !== 'function') {
                                        setShowDropdown(true);
                                        return;
                                    }
                                    const rect = btnEl.getBoundingClientRect();
                                    const left = rect.left + (window.scrollX || 0);
                                    const top = rect.bottom + (window.scrollY || 0);
                                    setDropdownCoords({ left, top });
                                    setShowDropdown(true);
                                } catch (e) {
                                    setShowDropdown(true);
                                }
                            }}
                        />
                        
                        <TitleSection 
                            story={story}
                            index={index}
                            currentTag={currentTag}
                            titleExpanded={titleExpanded}
                            descExpanded={descExpanded}
                            isTitleTruncated={isTitleTruncated}
                            isDescTruncated={isDescTruncated}
                            setTitleExpanded={setTitleExpanded}
                            setDescExpanded={setDescExpanded}
                            setIsTitleTruncated={setIsTitleTruncated}
                            setIsDescTruncated={setIsDescTruncated}
                        />
                        
                        <TagsSection 
                            story={story}
                            currentTag={currentTag}
                            onTagSelect={onTagSelect}
                            getTagName={getTagName}
                            getTagId={getTagId}
                        />
                        
                        <ActionButtons 
                            story={story}
                            localCommentsCount={localCommentsCount}
                            setShowCommentModal={setShowCommentModal}
                            setShowShareModal={setShowShareModal}
                            isAuthenticated={isAuthenticated}
                            openAuthModal={openAuthModal}
                            onStoryUpdate={onStoryUpdate} // Pass the update function
                            onLikeBurst={triggerLikeBurst}
                        />
                        
                        <CreatorChip 
                            story={story}
                            isOwner={isOwner}
                            isFollowing={isFollowing}
                            handleFollow={handleFollow}
                            handleOpenVerses={handleOpenVerses}
                            isViewerOpening={isViewerOpening}
                            getCreatorDisplayName={getCreatorDisplayName}
                            getCreatorUsername={getCreatorUsername}
                            getCreatorProfileImageUrl={getCreatorProfileImageUrl}
                            getCreatorInitial={getCreatorInitial}
                        />
                    </div>
                </div>
                
                {/* 
                   ✅ CRITICAL FIX: Conditional Rendering of Modals
                   Wrapping these in conditions ensures they ONLY mount when the user 
                   actually opens them (by clicking a button). This prevents the 
                   N+1 request waterfall issue where every card triggers 
                   API calls for all its children.
                */}
                
                {showStoryFormModal && (
                    <StoryFormModal
                        isOpen={showStoryFormModal}
                        onClose={() => { 
                            setShowStoryFormModal(false); 
                            setEditingVerseForModal(null); 
                        }}
                        editingStory={story}
                        editingVerse={editingVerseForModal}
                        mode="edit"
                        onUpdateStory={(updatedStory) => {
                            // Update the story in parent's state
                            if (onStoryUpdate) {
                                onStoryUpdate(updatedStory);
                            }
                        }}
                        onUpdateVerse={(updatedVerse) => {
                            // Update verse in local story state for immediate UI reflection
                            if (onStoryUpdate) {
                                const updatedStory = {
                                    ...story,
                                    verses: story.verses ? story.verses.map(v => v.id === updatedVerse.id ? updatedVerse : v) : story.verses
                                };
                                onStoryUpdate(updatedStory);
                            }
                        }}
                    />
                )}
                
                {showCommentModal && (
                    <CommentModal
                        isOpen={showCommentModal}
                        onClose={(e) => {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                            setTimeout(() => {
                                setShowCommentModal(false);
                            }, 0);
                        }}
                        post={story}
                        updateCommentCount={(slug, increment) => {
                            if (slug === story.slug) {
                                setLocalCommentsCount(prev => prev + increment);
                                
                                // Update the story in parent's state
                                if (onStoryUpdate) {
                                    const updatedStory = {
                                        ...story,
                                        comments_count: localCommentsCount + increment
                                    };
                                    onStoryUpdate(updatedStory);
                                }
                            }
                        }}
                    />
                )}
                
                {showVerseLoader && (
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-6">
                            {/* Circular Progress Loader */}
                            <div className="relative w-24 h-24">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="rgba(255, 255, 255, 0.1)"
                                        strokeWidth="3"
                                    />
                                    {/* Progress circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="url(#progressGradient)"
                                        strokeWidth="3"
                                        strokeDasharray={`${2 * Math.PI * 45}`}
                                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - verseLoaderProgress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.016s linear' }}
                                    />
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="50%" stopColor="#ec4899" />
                                            <stop offset="100%" stopColor="#fbbf24" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                {/* Center text */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">{Math.round(verseLoaderProgress)}%</span>
                                </div>
                            </div>
                            {/* Loading text */}
                            <p className="text-white text-lg font-semibold">Opening Verses...</p>
                        </div>
                    </div>
                )}
                
                {showVerseViewer && (
                    <VerseViewer
                        isOpen={showVerseViewer}
                        onClose={() => {
                            setShowVerseViewer(false);
                            setIsViewerOpening(false);
                        }}
                        story={fullStoryForViewer} // Use full story data with complete verse content
                        initialVerseIndex={0}
                        onReady={() => setIsViewerOpening(false)}
                        isAuthenticated={isAuthenticated}
                        openAuthModal={openAuthModal}
                        onStoryUpdate={(updatedStory) => {
                            setFullStoryForViewer(updatedStory);
                            if (onStoryUpdate) onStoryUpdate(updatedStory);
                        }}
                        onOpenStoryForm={(verse) => {
                            setEditingVerseForModal(verse);
                            setShowStoryFormModal(true);
                        }}
                    />
                )}
                
                {showShareModal && (
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        shareData={shareData}
                        imageUrl={getCoverImageUrl()}
                        isVerse={false}
                    />
                )}
                
                {showContributeModal && (
                    <ContributeModal 
                        showContributeModal={showContributeModal}
                        setShowContributeModal={setShowContributeModal}
                        story={story}
                        onStoryUpdated={(updatedStory) => {
                            // Update the story in parent's state
                            if (onStoryUpdate) { 
                                onStoryUpdate(updatedStory);
                            }
                        }}
                    />
                )}
                
                {showRecommendModal && (
                    <RecommendModal 
                        showRecommendModal={showRecommendModal}
                        setShowRecommendModal={setShowRecommendModal}
                        story={story}
                        isAuthenticated={isAuthenticated}
                        currentUser={currentUser}
                    />
                )}
                
                {showEnlargeModal && (
                    <EnlargeModal 
                        showEnlargeModal={showEnlargeModal}
                        setShowEnlargeModal={setShowEnlargeModal}
                        story={story}
                        getCoverImageUrl={getCoverImageUrl}
                    />
                )}
                
                {showDeleteModal && (
                    <DeleteModal 
                        showDeleteModal={showDeleteModal}
                        setShowDeleteModal={setShowDeleteModal}
                        story={story}
                        handleDeleteStory={handleDeleteStory}
                        isDeleting={isDeleting}
                    />
                )}
                
                {showDropdown && (
                    <DropdownMenu 
                        showDropdown={showDropdown}
                        setShowDropdown={(v) => {
                            setShowDropdown(v);
                            if (!v) setDropdownCoords(null);
                        }}
                        isOwner={isOwner}
                        isFollowing={isFollowing}
                        handleFollow={handleFollow}
                        handleEditStory={() => setShowStoryFormModal(true)}
                        handleDeleteStory={() => setShowDeleteModal(true)}
                        handleCopyLink={async () => {
                            const storyUrl = `${window.location.origin}/stories/${story.slug}/`;
                            try {
                                if (navigator.clipboard) {
                                    await navigator.clipboard.writeText(storyUrl);
                                    alert('Link copied to clipboard!');
                                } else {
                                    // Fallback for older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = storyUrl;
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        alert('Link copied to clipboard!');
                                    } catch (err) {
                                        alert('Unable to copy link. Please copy manually.');
                                    }
                                    document.body.removeChild(textArea);
                                }
                            } catch (error) {
                                alert('Failed to copy link. Please try again.');
                            }
                        }}
                        handleReportStory={() => alert('Report functionality would open here')}
                        handleShareStory={() => setShowShareModal(true)}
                        dropdownRef={dropdownRef}
                        coords={dropdownCoords}
                        creatorUsername={creatorUsername}
                    />
                )}
            </div>
        );
    }
    
    return null;
}

// 🚀 PERFORMANCE: Memoize component to prevent unnecessary re-renders
// This is critical for feed performance - prevents all cards from re-rendering when one story changes
export default React.memo(StoryCardInner);