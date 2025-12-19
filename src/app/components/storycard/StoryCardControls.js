// StoryCardControls.js - Client Component
// Contains ALL the heavy JS: modals, effects, interactivity, bubbles, state
// This loads AFTER the skeleton shows → image already loading
// All the 80KB of JS hydration happens in the background

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import dynamic from 'next/dynamic';
import { formatNumber, formatTimeAgo, createBubbles } from '../../../../lib/utils';
import { absoluteUrl, storiesApi, userApi } from '../../../../lib/api';

// Import modular components
import HologramIcons from './HologramIcons';
import TitleSection from './TitleSection';
import TagsSection from './TagsSection';
import ActionButtons from './ActionButtons';
import CreatorChip from './CreatorChip';

// Dynamically import modals with ssr: false
const ContributeModal = dynamic(() => import('./ContributeModal'), { ssr: false });
const RecommendModal = dynamic(() => import('./RecommendModal'), { ssr: false });
const EnlargeModal = dynamic(() => import('./EnlargeModal'), { ssr: false });
const DeleteModal = dynamic(() => import('./DeleteModal'), { ssr: false });
const DropdownMenu = dynamic(() => import('./DropdownModal'), { ssr: false });
const StoryFormModal = dynamic(() => import('../StoryFormModal'), { ssr: false });
const CommentModal = dynamic(() => import('../CommentModal'), { ssr: false });
const VerseViewer = dynamic(() => import('../VerseViewer'), { ssr: false });
const ShareModal = dynamic(() => import('../ShareModal'), { ssr: false });

export default function StoryCardControls({
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

    // Function to refetch story data
    const refetchStory = useCallback(async () => {
        try {
            const fullStory = await storiesApi.getStoryBySlug(story.slug);
            setCurrentStory(fullStory);
            setIsFollowing(fullStory.isFollowing || fullStory.is_following || false);
        } catch (error) {
            console.error('Error refetching story:', error);
        }
    }, [story.slug]);

    // Check if current user is the owner of the story
    const isOwner = (() => {
        if (!currentUser || !story) return false;

        const cuUsername = currentUser.username || '';
        const cuId = currentUser.id || currentUser.pk || currentUser.user_id || '';

        if (story.creator_username && cuUsername && story.creator_username === cuUsername) return true;
        if (story.creator_id && cuId && String(story.creator_id) === String(cuId)) return true;

        if (typeof story.creator === 'string') {
            if (cuUsername && story.creator === cuUsername) return true;
            if (cuId && String(story.creator) === String(cuId)) return true;
        }

        if (typeof story.creator === 'object' && story.creator) {
            const c = story.creator;
            if (c.username && cuUsername && c.username === cuUsername) return true;
            if ((c.id || c.pk || c.user_id) && cuId && String(c.id || c.pk || c.user_id) === String(cuId)) return true;
        }

        if (story.creator_user && cuUsername && story.creator_user === cuUsername) return true;

        return false;
    })();

    // OPTIMIZED: Defer bubble creation to avoid blocking image load
    // Only create bubbles after the skeleton has rendered
    useEffect(() => {
        if (!story) return;

        const updateFollowingState = () => {
            const followingValue = story.isFollowing || story.is_following || false;
            setIsFollowing(followingValue);
            setLocalCommentsCount(story.comments_count || 0);
            setCurrentStory(story);
        };

        updateFollowingState();

        // Check if story needs refetch
        const hasTagArray = Array.isArray(story.tags);
        const hasTagCount = story.tags_count !== undefined && story.tags_count !== null;
        const hasVerseArray = Array.isArray(story.verses);
        const hasVerseCount = story.verses_count !== undefined && story.verses_count !== null;

        const needsRefetch = !hasTagArray && !hasTagCount && (!hasVerseArray && !hasVerseCount);

        if (needsRefetch) {
            refetchStory();
        }

        // DEFER bubble creation with requestIdleCallback to avoid blocking main thread
        // This runs AFTER the browser has rendered everything else
        const createBubblesDeferred = () => {
            const node = hologramRef.current;
            if (node) {
                const existingBubbles = node.querySelectorAll('.bubble');
                existingBubbles.forEach(bubble => bubble.remove());

                const hologramId = `hologram-${story.id || Math.random().toString(36).substr(2, 9)}`;
                node.id = hologramId;
                createBubbles(hologramId);
            }
        };

        // Use requestIdleCallback if available, otherwise use setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
            const id = requestIdleCallback(() => createBubblesDeferred(), { timeout: 2000 });
            return () => cancelIdleCallback(id);
        } else {
            const id = setTimeout(createBubblesDeferred, 0);
            return () => clearTimeout(id);
        }
    }, [story, refetchStory]);

    // Keep a global reference used by the VerseViewer in sync
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

    const handleFollow = async (event, username) => {
        event.stopPropagation();

        if (!isAuthenticated) {
            openAuthModal('follow', username);
            return;
        }

        try {
            if (typeof onFollowUser === 'function') {
                setIsFollowing(prev => !prev);

                try {
                    await onFollowUser(username);
                } catch (error) {
                    setIsFollowing(prev => !prev);
                    throw error;
                }
                return;
            }

            const response = await userApi.followUser(username);
            setIsFollowing(response.is_following);
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const handleOpenVerses = useCallback(async () => {
        try {
            setIsViewerOpening(true);

            const fullStory = await storiesApi.getStoryBySlug(story.slug);
            setCurrentStory(fullStory);
            if (typeof window !== 'undefined') {
                window.__fullStoryForViewer = fullStory;
            }

            setShowVerseViewer(true);
        } catch (e) {
            console.error('Error fetching story verses:', e);
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
        if (story && story.creator_account_type === 'brand' && story.creator_brand_name) {
            return story.creator_brand_name;
        }

        if (story && typeof story.creator === 'object' && story.creator) {
            if (story.creator.account_type === 'brand' && story.creator.brand_name) {
                return story.creator.brand_name;
            }
        }

        if (story && story.creator_full_name) return story.creator_full_name;
        if (story && (story.creator_first_name || story.creator_last_name)) {
            return `${story.creator_first_name || ''}${story.creator_first_name && story.creator_last_name ? ' ' : ''}${story.creator_last_name || ''}`.trim();
        }

        if (story && typeof story.creator === 'string') return story.creator;

        if (story && typeof story.creator === 'object' && story.creator) {
            if (story.creator.first_name || story.creator.last_name) {
                return `${story.creator.first_name || ''}${story.creator.first_name && story.creator.last_name ? ' ' : ''}${story.creator.last_name || ''}`.trim();
            }
            if (story.creator.name) return story.creator.name;
            if (story.creator.username) return story.creator.username;
        }

        if (story && story.creator_username) return story.creator_username;
        return 'unknown';
    };

    const getCreatorUsername = () => {
        if (story && story.creator_username) return story.creator_username;
        if (story && typeof story.creator === 'string') return story.creator;
        if (story && typeof story.creator === 'object' && story.creator) {
            return story.creator.username || story.creator.id || String(story.creator.id || '') || 'anonymous';
        }
        return 'anonymous';
    };

    const getCreatorProfileImage = () => {
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

        if (typeof cov === 'string') {
            return cov ? absoluteUrl(cov) : null;
        }

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

    const _origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const shareData = {
        title: story.title || 'StoryVermo',
        description: story.description || 'Check out this story on StoryVermo',
        url: _origin ? `${_origin}/stories/${story.slug}/` : `/stories/${story.slug}/`
    };

    if (viewType === 'feed') {
        const creatorUsername = getCreatorUsername();

        return (
            <div className="storycard-controls" style={{ display: storyDeleted ? 'none' : 'block' }} ref={cardRef}>
                {/* All interactive elements layer on top of skeleton */}
                <div 
                    className="fixed-hologram absolute bottom-36 left-[5%] right-[5%] bg-black/60 backdrop-blur-[0.5px] border-2 border-[rgba(80,105,219,0.4)] rounded-2xl p-3 overflow-visible"
                    ref={hologramRef}
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

                {/* ALL MODALS - Load dynamically, render only when needed */}
                <StoryFormModal
                    isOpen={showStoryFormModal}
                    onClose={() => { setShowStoryFormModal(false); setEditingVerseForModal(null); }}
                    editingStory={currentStory}
                    editingVerse={editingVerseForModal}
                    mode="edit"
                    onUpdateStory={refetchStory}
                    onUpdateVerse={(updatedVerse) => {
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
                    creatorUsername={creatorUsername}
                />
            </div>
        );
    }

    return null;
}
