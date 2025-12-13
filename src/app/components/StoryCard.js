"use client";
// StoryCard.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';
import { formatNumber, formatTimeAgo, createBubbles } from '../../../lib/utils';
import { absoluteUrl, storiesApi, userApi } from '../../../lib/api';

// Import modular components
import HologramIcons from './storycard/HologramIcons';
import TitleSection from './storycard/TitleSection';
import TagsSection from './storycard/TagsSection';
import ActionButtons from './storycard/ActionButtons';
import CreatorChip from './storycard/CreatorChip';
import ContributeModal from './storycard/ContributeModal';
import RecommendModal from './storycard/RecommendModal';
import EnlargeModal from './storycard/EnlargeModal';
import DeleteModal from './storycard/DeleteModal';
import DropdownMenu from './storycard/DropdownModal';

// Import additional modals that were missing
import StoryFormModal from './StoryFormModal';
import CommentModal from './CommentModal';
import VerseViewer from './VerseViewer';
import ShareModal from './ShareModal';

export default function StoryCard({ 
    story, 
    index, 
    viewType = 'feed',
    onFollowUser,
    onOpenStoryVerses,
    onDeleteStory,
    currentTag,
    onTagSelect,
    isAuthenticated,
    openAuthModal
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
    const [showShareModal, setShowShareModal] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState(story.comments_count || 0);
    // Removed swipe-to-open states (gesture open was causing scroll issues)
    
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
    // If opening the StoryFormModal to edit a single verse, store it here
    const [editingVerseForModal, setEditingVerseForModal] = useState(null);
    
    // State for current story to handle updates
    const [currentStory, setCurrentStory] = useState(story);
    
    const cardRef = useRef(null);
    const hologramRef = useRef(null);
    const dropdownRef = useRef(null);

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

    // Function to refetch story data - MUST be before first useEffect that calls it
    const refetchStory = useCallback(async () => {
        try {
            const fullStory = await storiesApi.getStoryBySlug(story.slug);
            setCurrentStory(fullStory);
            setIsFollowing(fullStory.isFollowing || fullStory.is_following || false);
        } catch (error) {
            console.error('Error refetching story:', error);
        }
    }, [story.slug]);

    // Check if current user is the owner of the story (robust across different API shapes)
    const isOwner = (() => {
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
    })();

    useEffect(() => {
        if (!story) return;
        
        // Always update state based on the latest props
        const followingValue = story.isFollowing || story.is_following || false;
        setIsFollowing(followingValue);
        setLocalCommentsCount(story.comments_count || 0);
        // IMPORTANT: Set currentStory immediately with the prop story (which has verses_count, tags from paginated endpoint)
        // This ensures instant display without waiting for refetch
        setCurrentStory(story);

        // Only refetch if story is missing BOTH tag arrays AND tags count
        // This handles cases where paginated endpoint doesn't include tags
        const hasTagArray = Array.isArray(story.tags);
        const hasTagCount = story.tags_count !== undefined && story.tags_count !== null;
        const hasVerseArray = Array.isArray(story.verses);
        const hasVerseCount = story.verses_count !== undefined && story.verses_count !== null;
        
        const needsRefetch = !hasTagArray && !hasTagCount && (!hasVerseArray && !hasVerseCount);
        
        if (needsRefetch) {
            // Fire and forget - don't await, let refetch happen in background
            refetchStory();
        }

        // Create bubbles around the hologram
        const node = hologramRef.current;
        if (node) {
            const existingBubbles = node.querySelectorAll('.bubble');
            existingBubbles.forEach(bubble => bubble.remove());
            
            const hologramId = `hologram-${story.id || Math.random().toString(36).substr(2, 9)}`;
            node.id = hologramId;
            createBubbles(hologramId);
        }

        // Cleanup function to remove bubbles when component unmounts
        return () => {
            if (node) {
                const existingBubbles = node.querySelectorAll('.bubble');
                existingBubbles.forEach(bubble => bubble.remove());
            }
        };
    }, [story, refetchStory]);

    // Keep a global reference used by the VerseViewer in sync so the viewer
    // always reads the latest story even if it previously cached one on open.
    useEffect(() => {
        if (typeof window !== 'undefined' && currentStory) {
            try {
                window.__fullStoryForViewer = currentStory;
            } catch (e) {
                // ignore
            }
        }
    }, [currentStory]);

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

    // StoryCard.js - handleFollow function
    const handleFollow = async (event, username) => {
        event.stopPropagation();

        if (!isAuthenticated) {
            openAuthModal('follow', username);
            return;
        }

        try {
            // If a parent handler is provided, delegate to it so we don't call the
            // API twice (some parents already call userApi.followUser).
            if (typeof onFollowUser === 'function') {
                // Optimistically update isFollowing immediately
                setIsFollowing(prev => !prev);
                
                // Let parent perform the follow/unfollow action and update global state.
                // The parent will update the stories array, which will trigger this component's
                // useEffect to update isFollowing from the new story prop.
                try {
                    await onFollowUser(username);
                } catch (error) {
                    // If parent call fails, revert the optimistic update
                    setIsFollowing(prev => !prev);
                    throw error;
                }
                // Parent's handleFollowUser will update stories, which triggers our useEffect([story])
                // which will call setIsFollowing with the correct value from story.is_following
                return;
            }

            // Fallback: perform the API call locally when no parent handler exists
            const response = await userApi.followUser(username);
            setIsFollowing(response.is_following);
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const handleOpenVerses = useCallback(async () => {
        try {
            // Always log for debug
            // debug('[StoryCard] open verses clicked (optimistic open)', {
            //     slug: story?.slug,
            //     versesCount: Array.isArray(story?.verses) ? story.verses.length : 0,
            //     sampleVerses: Array.isArray(story?.verses) ? story.verses.slice(0,3) : story?.verses
            // });

            setIsViewerOpening(true);
            setShowVerseViewer(true);

            // Fetch latest story data asynchronously (do not block UI)
            const fullStory = await storiesApi.getStoryBySlug(story.slug);
            setCurrentStory(fullStory);
            if (typeof window !== 'undefined') {
                window.__fullStoryForViewer = fullStory;
            }
        } catch (e) {
            setIsViewerOpening(false);
        }
    }, [story.slug]);

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
            console.error('Failed to delete story:', err);
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

    // FIXED: Improved getCoverImageUrl function to handle all image URL formats
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

    // Share data (guard window for SSR). If origin is not available on server,
    // fall back to a relative URL so server render doesn't crash.
    const _origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const shareData = {
        title: story.title || 'StoryVermo',
        description: story.description || 'Check out this story on StoryVermo',
        url: _origin ? `${_origin}/stories/${story.slug}/` : `/stories/${story.slug}/`
    };

    if (viewType === 'feed') {
        const coverImageUrl = getCoverImageUrl();
        const creatorUsername = getCreatorUsername(); // Get the username once
        
        return (
            <div className="image-container" style={{ display: storyDeleted ? 'none' : 'block' }}>
                <div 
                    ref={cardRef} 
                    className="scene-card" 
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
                    // Removed touch handlers to avoid blocking vertical scroll.
                >
                    {coverImageUrl ? (
                        <div className="relative w-full h-full">
                        {/* Using Next.js Image for automatic optimization, lazy loading, and format conversion */}
                        <Image 
                            src={coverImageUrl} 
                            alt={story.title || 'Story cover'} 
                            fill
                            className="scene-bg w-full h-full "
                            quality={75}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                            priority={index === 0}  // ✅ THIS IS CORRECT - KEEP IT
                        />
                    </div>
                    ) : (
                        <div className="scene-bg-placeholder bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                            <div className="text-slate-600 text-4xl">
                                <i className="fas fa-image"></i>
                            </div>
                        </div>
                    )}
                    <div className="scene-overlay"></div>
                    
                    {/* Updated hologram with fixed positioning */}
                    <div 
                        ref={hologramRef}
                        className="fixed-hologram absolute bottom-36  left-[5%] right-[5%] bg-black/60 backdrop-blur-[0.5px] border-2 border-[rgba(80,105,219,0.4)] rounded-2xl p-3 overflow-visible  "
                        style={{
                            position: 'absolute',
                            transform: 'translateZ(0)',
                            willChange: 'transform',
                            userSelect: 'none'
                        }}
                    >
                        <HologramIcons 
                            story={currentStory}
                            isOwner={isOwner}
                            isAuthenticated={isAuthenticated}
                            openAuthModal={openAuthModal}
                            setShowContributeModal={setShowContributeModal}
                            setShowRecommendModal={setShowRecommendModal}
                            setShowEnlargeModal={setShowEnlargeModal}
                            // new handler: compute coords and open dropdown
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
                            story={currentStory}
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
                            story={currentStory}
                            currentTag={currentTag}
                            onTagSelect={onTagSelect}
                            getTagName={getTagName}
                            getTagId={getTagId}
                        />
                        
                        <ActionButtons 
                            story={currentStory}
                            localCommentsCount={localCommentsCount}
                            setShowCommentModal={setShowCommentModal}
                            setShowShareModal={setShowShareModal}
                            isAuthenticated={isAuthenticated}
                            openAuthModal={openAuthModal}
                            onStoryUpdate={refetchStory}
                            onLikeBurst={triggerLikeBurst}
                        />
                        
                        <CreatorChip 
                            story={currentStory}
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
                
                {/* Modals */}
                <StoryFormModal
                    isOpen={showStoryFormModal}
                    onClose={() => { setShowStoryFormModal(false); setEditingVerseForModal(null); }}
                    editingStory={currentStory}
                    editingVerse={editingVerseForModal}
                    mode="edit"
                    onUpdateStory={refetchStory}
                    onUpdateVerse={(updatedVerse) => {
                        // update verse in local story state for immediate UI reflection
                        setCurrentStory(prev => ({
                            ...prev,
                            verses: prev.verses ? prev.verses.map(v => v.id === updatedVerse.id ? updatedVerse : v) : prev.verses
                        }));
                    }}
                />
                
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
                    post={currentStory}
                    updateCommentCount={(slug, increment) => {
                        if (slug === story.slug) {
                            setLocalCommentsCount(prev => prev + increment);
                        }
                    }}
                />
                
                <VerseViewer
                    isOpen={showVerseViewer}
                    onClose={() => {
                        setShowVerseViewer(false);
                        setIsViewerOpening(false);
                        // Clean up
                        if (typeof window !== 'undefined') delete window.__fullStoryForViewer;
                    }}
                    story={(typeof window !== 'undefined' && window.__fullStoryForViewer) ? window.__fullStoryForViewer : currentStory}
                    initialVerseIndex={0}
                    onReady={() => setIsViewerOpening(false)}
                    isAuthenticated={isAuthenticated}
                    openAuthModal={openAuthModal}
                    onStoryUpdate={refetchStory}
                    onOpenStoryForm={(verse) => {
                        setEditingVerseForModal(verse);
                        setShowStoryFormModal(true);
                    }}
                />
                
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    shareData={shareData}
                    imageUrl={getCoverImageUrl()}
                    isVerse={false}
                />
                
                <ContributeModal 
                    showContributeModal={showContributeModal}
                    setShowContributeModal={setShowContributeModal}
                    story={currentStory}
                    onStoryUpdated={refetchStory}
                />
                
                <RecommendModal 
                    showRecommendModal={showRecommendModal}
                    setShowRecommendModal={setShowRecommendModal}
                    story={currentStory}
                    isAuthenticated={isAuthenticated}
                    currentUser={currentUser}
                />
                
                <EnlargeModal 
                    showEnlargeModal={showEnlargeModal}
                    setShowEnlargeModal={setShowEnlargeModal}
                    story={currentStory}
                    getCoverImageUrl={getCoverImageUrl}
                />
                
                <DeleteModal 
                    showDeleteModal={showDeleteModal}
                    setShowDeleteModal={setShowDeleteModal}
                    story={currentStory}
                    handleDeleteStory={handleDeleteStory}
                    isDeleting={isDeleting}
                />
                
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
                                    console.error('Fallback: Oops, unable to copy', err);
                                    alert('Unable to copy link. Please copy manually.');
                                }
                                document.body.removeChild(textArea);
                            }
                        } catch (error) {
                            console.error('Error copying to clipboard:', error);
                            alert('Failed to copy link. Please try again.');
                        }
                    }}
                    handleReportStory={() => alert('Report functionality would open here')}
                    handleShareStory={() => setShowShareModal(true)}
                    dropdownRef={dropdownRef}
                    coords={dropdownCoords}
                    creatorUsername={creatorUsername} // Pass the username to the dropdown
                />
            </div>
        );
    }
    
    if (viewType === 'grid') {
        const imageUrl = getFirstVerseImage() || getCoverImageUrl();
        
        return (
            <div className="verse-card" onClick={handleOpenVerses}>
                {imageUrl ? (
                    // Using Next.js Image for automatic optimization
                    <Image 
                        src={imageUrl} 
                        alt={story.title || 'Untitled Story'}
                        fill
                        className="w-full h-full object-cover"
                        quality={75}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="verse-card-placeholder bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <div className="text-slate-600 text-4xl">
                            <i className="fas fa-image"></i>
                        </div>
                    </div>
                )}
                <div className="verse-card-overlay">
                    <div className="verse-card-user">
                        <div className="verse-card-avatar">{getCreatorInitial()}</div>
                        <div className="verse-card-username">@{getCreatorUsername()}</div>
                    </div>
                    <div className="verse-card-title">{story.title || 'Untitled Story'}</div>
                    <div className="verse-card-verses">
                        <i className="fas fa-book-open text-white"></i>
                        <span className="verse-card-count">{Array.isArray(story.verses) ? story.verses.length : 0}</span>
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
}