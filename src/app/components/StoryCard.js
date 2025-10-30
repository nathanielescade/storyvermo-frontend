"use client";
// StoryCard.js
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
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
    const [isLiked, setIsLiked] = useState(story.is_liked_by_user || false);
    const [isSaved, setIsSaved] = useState(story.is_saved_by_user || false);
    const [isFollowing, setIsFollowing] = useState(story.isFollowing || story.is_following || false);
    const [titleExpanded, setTitleExpanded] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);
    const [isDescTruncated, setIsDescTruncated] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showVerseViewer, setShowVerseViewer] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState(story.comments_count || 0);
    
    // Hologram icon modals
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [showRecommendModal, setShowRecommendModal] = useState(false);
    const [showEnlargeModal, setShowEnlargeModal] = useState(false);
    const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // Story form modal
    const [showStoryFormModal, setShowStoryFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [storyDeleted, setStoryDeleted] = useState(false);
    
    // State for current story to handle updates
    const [currentStory, setCurrentStory] = useState(story);
    
    const cardRef = useRef(null);
    const hologramRef = useRef(null);
    const dropdownRef = useRef(null);

    // Check if current user is the owner of the story
    const isOwner = currentUser && story.creator && 
        ((typeof story.creator === 'string' && story.creator === currentUser.username) ||
         (typeof story.creator === 'object' && story.creator.username === currentUser.username));

    useEffect(() => {
        // Initialize state based on props
        setIsLiked(story.is_liked_by_user || false);
        setIsSaved(story.is_saved_by_user || false);
        setIsFollowing(story.isFollowing || story.is_following || false);
        setLocalCommentsCount(story.comments_count || 0);
        setCurrentStory(story);

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
    }, [story]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Function to refetch story data
    const refetchStory = async () => {
        try {
            const fullStory = await storiesApi.getStoryBySlug(story.slug);
            setCurrentStory(fullStory);
            setIsLiked(fullStory.is_liked_by_user || false);
            setIsSaved(fullStory.is_saved_by_user || false);
            setIsFollowing(fullStory.isFollowing || fullStory.is_following || false);
        } catch (error) {
            console.error('Error refetching story:', error);
        }
    };

// StoryCard.js - handleFollow function
// StoryCard.js - Updated handleFollow function
// StoryCard.js - Updated handleFollow function
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
            // Let parent perform the follow/unfollow action and update global state.
            await onFollowUser(username);
            // Optimistically toggle local state to reflect expected change. Parent
            // will update authoritative state eventually.
            setIsFollowing(prev => !prev);
            return;
        }

        // Fallback: perform the API call locally when no parent handler exists
        const response = await userApi.followUser(username);
        setIsFollowing(response.is_following);
    } catch (error) {
        console.error('Error following user:', error);
    }
};

    const handleOpenVerses = async () => {
        try {
            console.debug('[StoryCard] open verses clicked', {
                slug: story?.slug,
                versesCount: Array.isArray(story?.verses) ? story.verses.length : 0,
                sampleVerses: Array.isArray(story?.verses) ? story.verses.slice(0,3) : story?.verses
            });
            
            // Always fetch the latest story data
            const fullStory = await storiesApi.getStoryBySlug(story.slug);
            setCurrentStory(fullStory);
            if (typeof window !== 'undefined') {
                window.__fullStoryForViewer = fullStory;
            }
            setShowVerseViewer(true);
        } catch (e) {
            console.warn('[StoryCard] failed logging story on open', e);
        }
    };

    const handleDeleteStory = async () => {
        setShowDeleteModal(false);
        const slug = story.slug;
        if (!slug) {
            alert('Cannot delete story: missing slug/identifier.');
            setShowDropdown(false);
            return;
        }

        try {
            setIsDeleting(true);
            await storiesApi.deleteStory(slug);
            setShowDropdown(false);
            setStoryDeleted(true);
            
            if (cardRef.current) {
                cardRef.current.style.transition = 'all 0.5s ease-out';
                cardRef.current.style.opacity = '0';
                cardRef.current.style.transform = 'translateY(-20px)';
            }
            
            setTimeout(() => {
                if (typeof onDeleteStory === 'function') {
                    try { onDeleteStory(slug); } catch (e) { console.warn('onDeleteStory callback failed', e); }
                }
            }, 500);
        } catch (err) {
            console.error('Failed to delete story:', err);
            alert(`Failed to delete story: ${err.message || err}`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper functions
    const getCreatorDisplayName = () => {
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
        if (typeof cov === 'string') return cov ? absoluteUrl(cov) : null;
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
        title: story.title || 'StoryVerm',
        description: story.description || 'Check out this story on StoryVerm',
        url: _origin ? `${_origin}/stories/${story.slug}/` : `/stories/${story.slug}/`
    };

    if (viewType === 'feed') {
        const coverImageUrl = getCoverImageUrl();
        
        return (
            <div className="image-container" style={{ display: storyDeleted ? 'none' : 'block' }}>
                <div ref={cardRef} className="scene-card" style={{ transition: 'all 0.5s ease-out' }} data-story-id={story.id} data-creator={getCreatorUsername()} data-story-slug={story.slug || ''}>
                    {coverImageUrl ? (
                        <img src={coverImageUrl} alt={story.title || 'Story cover'} className="scene-bg" />
                    ) : (
                        <div className="scene-bg-placeholder bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                            <div className="text-slate-600 text-4xl">
                                <i className="fas fa-image"></i>
                            </div>
                        </div>
                    )}
                    <div className="scene-overlay"></div>
                    
                    {/* Updated hologram with Tailwind classes */}
                    <div 
                        ref={hologramRef}
                        className="absolute bottom-20 left-[5%] right-[5%] bg-black/60 backdrop-blur-[0.5px] border-2 border-[rgba(80,105,219,0.4)] rounded-2xl p-5 overflow-visible max-md:bottom-[150px]"
                    >
                        <HologramIcons 
                            story={currentStory}
                            isOwner={isOwner}
                            isAuthenticated={isAuthenticated}
                            openAuthModal={openAuthModal}
                            setShowContributeModal={setShowContributeModal}
                            setShowRecommendModal={setShowRecommendModal}
                            setShowEnlargeModal={setShowEnlargeModal}
                            setShowDropdown={setShowDropdown}
                        />
                        
                        <TitleSection 
                            story={currentStory}
                            index={index}
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
                            isLiked={isLiked}
                            isSaved={isSaved}
                            localCommentsCount={localCommentsCount}
                            setIsLiked={setIsLiked}
                            setIsSaved={setIsSaved}
                            setStory={setCurrentStory}
                            setShowCommentModal={setShowCommentModal}
                            setShowShareModal={setShowShareModal}
                        />
                        
                        <CreatorChip 
                            story={currentStory}
                            isOwner={isOwner}
                            isFollowing={isFollowing}
                            handleFollow={handleFollow}
                            handleOpenVerses={handleOpenVerses}
                            getCreatorDisplayName={getCreatorDisplayName}
                            getCreatorUsername={getCreatorUsername}
                            getCreatorProfileImageUrl={getCreatorProfileImageUrl}
                            getCreatorInitial={getCreatorInitial}
                        />
                    </div>
                    
                    <div className="story-swipe-indicator"></div>
                </div>
                
                {/* Modals */}
                <StoryFormModal
                    isOpen={showStoryFormModal}
                    onClose={() => setShowStoryFormModal(false)}
                    editingStory={currentStory}
                    mode="edit"
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
                        // Clean up
                        if (typeof window !== 'undefined') delete window.__fullStoryForViewer;
                    }}
                    story={(typeof window !== 'undefined' && window.__fullStoryForViewer) ? window.__fullStoryForViewer : currentStory}
                    initialVerseIndex={0}
                    onStoryUpdated={refetchStory}
                    onVerseDeleted={(verseId) => {
                        // Update the verse count when a verse is deleted
                        setCurrentStory(prev => ({
                            ...prev,
                            verses: prev.verses.filter(v => v.id !== verseId)
                        }));
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
                    setShowDropdown={setShowDropdown}
                    isOwner={isOwner}
                    isFollowing={isFollowing}
                    handleFollow={handleFollow}
                    handleEditStory={() => setShowStoryFormModal(true)}
                    handleDeleteStory={() => setShowDeleteModal(true)}
                    handleCopyLink={() => {
                        const storyUrl = `${window.location.origin}/stories/${story.slug}/`;
                        navigator.clipboard.writeText(storyUrl);
                        alert('Link copied to clipboard!');
                    }}
                    handleReportStory={() => alert('Report functionality would open here')}
                    handleShareStory={() => setShowShareModal(true)}
                    dropdownRef={dropdownRef}
                />
            </div>
        );
    }
    
    if (viewType === 'grid') {
        const imageUrl = getFirstVerseImage() || getCoverImageUrl();
        
        return (
            <div className="verse-card" onClick={handleOpenVerses}>
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={story.title || 'Untitled Story'} 
                    />
                ) : (
                    <div className="verse-card-placeholder bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
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