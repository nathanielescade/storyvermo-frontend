/* Note: stray dev note originally present in this file removed.
    Original text: "bro, when we click on the verseviewer..."
    File contains StoryCard component and Verse-related modal logic.
*/
// components/StoryCard.js
import { useState, useEffect, useRef } from 'react';
import StoryFormModal from './StoryFormModal';
import { useAuth } from '../../../contexts/AuthContext';
import CommentModal from './CommentModal';
import VerseViewer from './VerseViewer';
import ShareModal from './ShareModal';
import { formatNumber, formatTimeAgo, createBubbles } from '../../../lib/utils';
import { absoluteUrl, storiesApi } from '../../../lib/api';

export default function StoryCard({ 
    story, 
    index, 
    viewType = 'feed',
    onLikeToggle,
    onSaveToggle,
    onFollowUser,
    onOpenStoryVerses,
    onDeleteStory,
    currentTag,
    onTagSelect,
    isAuthenticated,
    openAuthModal
}) {
    const { currentUser } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [titleExpanded, setTitleExpanded] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);
    const [isDescTruncated, setIsDescTruncated] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showVerseViewer, setShowVerseViewer] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [localCommentsCount, setLocalCommentsCount] = useState(story.comments_count || 0);
    
    // New state for hologram icon modals
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [showRecommendModal, setShowRecommendModal] = useState(false);
    const [showEnlargeModal, setShowEnlargeModal] = useState(false);
    const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
    const [recommendMessage, setRecommendMessage] = useState('');
    const [recommendUsers, setRecommendUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    // State for StoryFormModal (edit mode)
    const [showStoryFormModal, setShowStoryFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [storyDeleted, setStoryDeleted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const cardRef = useRef(null);
    
    // Contribute form state
    const [verseContent, setVerseContent] = useState('');
    const [verseImages, setVerseImages] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const titleRef = useRef(null);
    const descRef = useRef(null);
    const hologramRef = useRef(null);
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Check if current user is the owner of the story
    const isOwner = currentUser && story.creator && 
        ((typeof story.creator === 'string' && story.creator === currentUser.username) ||
         (typeof story.creator === 'object' && story.creator.username === currentUser.username));

    useEffect(() => {
        // Initialize state based on props
        setIsLiked(story.isLiked || false);
        setIsSaved(story.isSaved || false);
        setIsFollowing(story.isFollowing || false);
        setLocalCommentsCount(story.comments_count || 0);

        // Create bubbles around the hologram
        if (hologramRef.current) {
            // Clear any existing bubbles
            const existingBubbles = hologramRef.current.querySelectorAll('.bubble');
            existingBubbles.forEach(bubble => bubble.remove());
            
            // Create new bubbles
            const hologramId = `hologram-${story.id || Math.random().toString(36).substr(2, 9)}`;
            hologramRef.current.id = hologramId;
            createBubbles(hologramId);
        }

        // Check if title and description are truncated
        checkTruncation();

        // Cleanup function to remove bubbles when component unmounts
        return () => {
            if (hologramRef.current) {
                const existingBubbles = hologramRef.current.querySelectorAll('.bubble');
                existingBubbles.forEach(bubble => bubble.remove());
            }
        };
    }, [story]);

    // Check truncation when content changes or component mounts
    useEffect(() => {
        checkTruncation();
    }, [story.title, story.description, titleExpanded, descExpanded]);

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

    // Function to check if text is truncated
    const checkTruncation = () => {
        if (titleRef.current) {
            const isTruncated = titleRef.current.scrollHeight > titleRef.current.clientHeight;
            setIsTitleTruncated(isTruncated);
        }
        
        if (descRef.current) {
            const isTruncated = descRef.current.scrollHeight > descRef.current.clientHeight;
            setIsDescTruncated(isTruncated);
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) {
            openAuthModal('like', story.slug);
            return;
        }
        
        try {
            const newLikedState = !isLiked;
            setIsLiked(newLikedState);
            
            if (onLikeToggle) {
                await onLikeToggle(story.slug);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert state on error
            setIsLiked(!isLiked);
        }
    };

    const handleSave = async () => {
        if (!isAuthenticated) {
            openAuthModal('save', story.slug);
            return;
        }
        
        try {
            const newSavedState = !isSaved;
            setIsSaved(newSavedState);
            
            if (onSaveToggle) {
                await onSaveToggle(story.slug);
            }
        } catch (error) {
            console.error('Error toggling save:', error);
            // Revert state on error
            setIsSaved(!isSaved);
        }
    };

    const handleFollow = async (event) => {
        event.stopPropagation();
        
        if (!isAuthenticated) {
            const creatorId = typeof story.creator === 'object' ? story.creator.id || story.creator.username : story.creator;
            openAuthModal('follow', creatorId);
            return;
        }
        
        try {
            const newFollowingState = !isFollowing;
            setIsFollowing(newFollowingState);
            
            if (onFollowUser) {
                // Pass the creator's username or ID, not the entire object
                const creatorId = typeof story.creator === 'object' ? story.creator.id || story.creator.username : story.creator;
                await onFollowUser(creatorId);
            }
        } catch (error) {
            console.error('Error following user:', error);
            // Revert state on error
            setIsFollowing(!isFollowing);
        }
    };

    const handleOpenVerses = () => {
        // Open the verse viewer modal instead of navigating to a new page
        try {
            console.debug('[StoryCard] open verses clicked', {
                slug: story?.slug,
                versesCount: Array.isArray(story?.verses) ? story.verses.length : 0,
                sampleVerses: Array.isArray(story?.verses) ? story.verses.slice(0,3) : story?.verses
            });
        } catch (e) {
            console.warn('[StoryCard] failed logging story on open', e);
        }
        setShowVerseViewer(true);
    };

    const toggleTitle = () => {
        setTitleExpanded(!titleExpanded);
    };

    const toggleDescription = () => {
        setDescExpanded(!descExpanded);
    };

    // Handle hologram icon actions
    const handleContribute = () => {
        if (!isAuthenticated) {
            openAuthModal('contribute', { slug: story.slug, id: story.id });
            return;
        }
        setShowContributeModal(true);
    };

    const handleRecommend = () => {
        if (!isAuthenticated) {
            openAuthModal('recommend', { id: story.id, slug: story.slug });
            return;
        }
        // Mock users for recommendation
        setRecommendUsers([
            { id: 1, username: 'user1', name: 'User One' },
            { id: 2, username: 'user2', name: 'User Two' },
            { id: 3, username: 'user3', name: 'User Three' }
        ]);
        setShowRecommendModal(true);
    };

    const handleEnlarge = () => {
        setShowEnlargeModal(true);
    };

    const handleMoreOptions = (event) => {
        event.stopPropagation();
        setShowDropdown(!showDropdown);
    };

    const handleRecommendSubmit = () => {
        // Here you would send the recommendation to the selected users
        console.log('Recommending story to:', selectedUsers, 'with message:', recommendMessage);
        setShowRecommendModal(false);
        setRecommendMessage('');
        setSelectedUsers([]);
        setSearchTerm('');
        // Show success message
        alert('Story recommended successfully!');
    };

    const handleCopyLink = () => {
        const storyUrl = `${window.location.origin}/stories/${story.slug}/`;
        navigator.clipboard.writeText(storyUrl);
        alert('Link copied to clipboard!');
        setShowDropdown(false);
    };

    const handleReportStory = () => {
        // Here you would open a report form
        alert('Report functionality would open here');
        setShowDropdown(false);
    };

    const handleShareStory = () => {
        setShowShareModal(true);
        setShowDropdown(false);
    };

    const handleEditStory = () => {
        setShowStoryFormModal(true);
        setShowDropdown(false);
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
            
            // Add fade-out animation to the story card
            if (cardRef.current) {
                cardRef.current.style.transition = 'all 0.5s ease-out';
                cardRef.current.style.opacity = '0';
                cardRef.current.style.transform = 'translateY(-20px)';
            }
            
            // Wait for animation to complete before removing from parent
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

    const handleDownloadImage = () => {
        const coverImageUrl = getCoverImageUrl();
        if (!coverImageUrl) return;
        
        const link = document.createElement('a');
        link.href = coverImageUrl;
        link.download = `${story.title || 'story'}-cover.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(recommendUsers.map(user => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    // Contribute modal functions
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const validFiles = [];
            const invalidFiles = [];
            const imagePreviews = [];
            
            for (const file of files) {
                if (file.size > 10 * 1024 * 1024) {
                    invalidFiles.push(`${file.name} is too large (>10MB)`);
                } else if (!file.type.startsWith('image/')) {
                    invalidFiles.push(`${file.name} is not a valid image`);
                } else {
                    validFiles.push(file);
                    // Generate preview for each valid file
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imagePreviews.push({
                            file: file,
                            preview: event.target.result,
                            name: file.name
                        });
                        
                        // Update state when all files are processed
                        if (imagePreviews.length === validFiles.length) {
                            setVerseImages(prev => [...prev, ...imagePreviews]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
            
            if (invalidFiles.length > 0) {
                alert(`Invalid files: ${invalidFiles.join(', ')}`);
            }
        }
    };

    const removeImage = (index) => {
        setVerseImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitContribution = async () => {
        if (!verseContent.trim() && verseImages.length === 0) {
            alert('Please add either text content or at least one image to your verse.');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Create FormData for submission
            const formData = new FormData();
            formData.append('story', story.id);
            formData.append('content', verseContent);
            
            // Add images
            verseImages.forEach((image, index) => {
                if (image.file) {
                    formData.append(`images`, image.file);
                }
            });
            
            // Here you would submit to your API
            console.log('Submitting verse:', {
                story: story.id,
                content: verseContent,
                images: verseImages.length
            });
            
            // Reset form
            setVerseContent('');
            setVerseImages([]);
            setShowContributeModal(false);
            
            // Show success message
            alert('Verse contributed successfully!');
            
            // Refresh the story data if needed
            if (onOpenStoryVerses) {
                onOpenStoryVerses(story.id);
            }
        } catch (error) {
            console.error('Error submitting verse:', error);
            alert('Error submitting verse. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper function to get icon class (use Tailwind color utilities)
    const getIconClass = (isTrue, iconType) => {
        return `${isTrue ? 'fas' : 'far'} ${iconType} text-[18px] ${isTrue ? 'text-[#ff6b35]' : 'text-white'}`;
    };

    const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer transition-transform duration-200 ease-in-out relative';
    const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
    const activeClasses = 'bg-[#ff6b35]/10 border-2 border-[#ff6b35]';

    // Helper function to get creator display name
    const getCreatorDisplayName = () => {
        if (!story.creator) return 'unknown';
        if (typeof story.creator === 'string') return story.creator;
        return story.creator.name || story.creator.username || 'unknown';
    };

    // Helper function to get creator username for URLs
    const getCreatorUsername = () => {
        if (!story.creator) return 'anonymous';
        if (typeof story.creator === 'string') return story.creator;
        return story.creator.username || story.creator.id || 'anonymous';
    };

    // Helper function to get creator profile image
    const getCreatorProfileImage = () => {
        if (typeof story.creator === 'object' && story.creator) {
            return story.creator.profile_image || story.creator.avatar;
        }
        return null;
    };

    // Helper to get absolute cover image URL
    const getCoverImageUrl = () => {
        if (!story) return null;
        const cov = story.cover_image;
        if (!cov) return null;
        if (typeof cov === 'string') return cov ? absoluteUrl(cov) : null;
        // cov may be an object with file_url or url
        const url = cov.file_url || cov.url || '';
        return url ? absoluteUrl(url) : null;
    };

    // Helper to get verse image (first) absolute URL
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

    // Helper to get absolute creator profile image URL
    const getCreatorProfileImageUrl = () => {
        const img = getCreatorProfileImage();
        return img ? absoluteUrl(img) : null;
    };

    // Helper function to get creator initial
    const getCreatorInitial = () => {
        const name = getCreatorDisplayName();
        return name.charAt(0);
    };

    // Helper function to get tag name
    const getTagName = (tag) => {
        if (typeof tag === 'string') return tag;
        return tag.name || tag.slug || tag.id || 'tag';
    };

    // Helper function to get tag ID for key
    const getTagId = (tag) => {
        if (typeof tag === 'string') return tag;
        return tag.id || tag.slug || tag.name;
    };

    // Filter users based on search term
    const filteredUsers = recommendUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Prepare share data for ShareModal
    const shareData = {
        title: story.title || 'StoryVerm',
        description: story.description || 'Check out this story on StoryVerm',
        url: `${window.location.origin}/stories/${story.slug}/`
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
                    
                    <div className="scene-hologram" ref={hologramRef} style={{ overflow: 'visible' }}>
                        {/* Top hologram icons row */}
                        <div className="hologram-icons-row" style={{ position: 'absolute', right: '0.5rem', top: '-32px', display: 'flex', gap: '18px', zIndex: '10' }}>
                            {story.allow_contributions && !isOwner && (
                                <button 
                                    className="hologram-icon-btn" 
                                    title="Contribute" 
                                    onClick={handleContribute}
                                    style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #ff6b35', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#ff6b35', fontSize: '1.25rem', cursor: 'pointer' }}
                                >
                                    <i className="fas fa-plus"></i>
                                </button>
                            )}
                            <button 
                                className="hologram-icon-btn" 
                                title="Recommend" 
                                onClick={handleRecommend}
                                style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #0ff', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#0ff', fontSize: '1.25rem', cursor: 'pointer' }}
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                            <button 
                                className="hologram-icon-btn" 
                                title="View Image" 
                                onClick={handleEnlarge}
                                style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #ff6b35', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#ff6b35', fontSize: '1.25rem', cursor: 'pointer' }}
                            >
                                <i className="fas fa-expand"></i>
                            </button>
                            {/* More Options (Ellipsis) Button */}
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    className="hologram-icon-btn" 
                                    title="More Options" 
                                    onClick={handleMoreOptions}
                                    style={{ 
                                        background: 'rgba(255,255,255,0.18)', 
                                        borderRadius: '50%', 
                                        border: '2px solid #9d00ff', 
                                        width: '38px', 
                                        height: '38px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.10), 0 0 15px rgba(157,0,255,0.3)', 
                                        color: '#ffffff', 
                                        fontSize: '1.25rem', 
                                        cursor: 'pointer', 
                                        position: 'relative', 
                                        overflow: 'hidden' 
                                    }}
                                >
                                    <i className="fas fa-ellipsis-v"></i>
                                </button>
                                
                                {/* Dropdown Menu */}
                                {showDropdown && (
                                    <div className="dropdown-menu absolute right-0 top-8 z-20 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                                        {isOwner ? (
                                            <>
                                                <button 
                                                    className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors"
                                                    onClick={handleEditStory}
                                                >
                                                    <i className="fas fa-edit text-blue-400"></i>
                                                    <span>Edit Post</span>
                                                </button>
                                                <button 
                                                    className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                                                    onClick={() => {
                                                        setShowDropdown(false);
                                                        setShowDeleteModal(true);
                                                    }}
                                                >
                                                    <i className="fas fa-trash text-red-400"></i>
                                                    <span>Delete Post</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {!isFollowing && (
                                                    <button 
                                                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors"
                                                        onClick={handleFollow}
                                                    >
                                                        <i className="fas fa-user-plus text-green-400"></i>
                                                        <span>Follow User</span>
                                                    </button>
                                                )}
                                                <button 
                                                    className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                                                    onClick={handleReportStory}
                                                >
                                                    <i className="fas fa-flag text-yellow-400"></i>
                                                    <span>Report Post</span>
                                                </button>
                                            </>
                                        )}
                                        <button 
                                            className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                                            onClick={handleCopyLink}
                                        >
                                            <i className="fas fa-link text-green-400"></i>
                                            <span>Copy Link</span>
                                        </button>
                                        <button 
                                            className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                                            onClick={handleShareStory}
                                        >
                                            <i className="fas fa-share text-green-400"></i>
                                            <span>Share Post</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Title with inline truncation and read more */}
                        <div className="title-container" id={`title-container-${index}`}>
                            <a href={`/stories/${story.slug}/`} className="block">
                                <h2 
                                    ref={titleRef}
                                    className={`scene-title text-3xl font-bold mb-2.5 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent hover:underline ${
                                        titleExpanded ? '' : 'line-clamp-2'
                                    }`}
                                    id={`title-${index}`}
                                >
                                    {story.title || 'Untitled Story'}
                                </h2>
                            </a>
                            {isTitleTruncated && (
                                <span 
                                    className="title-read-more" 
                                    id={`title-readmore-${index}`}
                                    onClick={toggleTitle}
                                >
                                    {titleExpanded ? 'Read less' : 'Read more'}
                                </span>
                            )}
                        </div>
                        
                        {/* Description with inline truncation and read more */}
                        <div className="desc-container" id={`desc-container-${index}`}>
                            <div 
                                ref={descRef}
                                className={`scene-description ${
                                    descExpanded ? '' : 'line-clamp-3'
                                }`}
                                id={`desc-${index}`}
                            >
                                {story.description || 'No description available.'}
                            </div>
                            {isDescTruncated && (
                                <span 
                                    className="read-more-btn" 
                                    id={`readmore-${index}`}
                                    onClick={toggleDescription}
                                >
                                    {descExpanded ? 'Read less' : 'Read more'}
                                </span>
                            )}
                        </div>
                        
                        <div className="scene-tags-container">
                            <div className="scene-tags">
                                {story.tags && Array.isArray(story.tags) && story.tags.map(tag => {
                                    const tagName = getTagName(tag);
                                    const tagId = getTagId(tag);
                                    const isActive = currentTag === tagName;
                                    
                                    return (
                                        <a 
                                            key={tagId} 
                                            href={`/tags/${encodeURIComponent(String(tagName).toLowerCase().replace(/\s+/g,'-'))}/`} 
                                            data-tag={tagName} 
                                            className={`scene-tag py-1 px-2.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                                                isActive
                                                    ? 'bg-gradient-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100' 
                                                    : 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/40'
                                            }`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (onTagSelect) {
                                                    onTagSelect(tagName);
                                                }
                                            }}
                                        >
                                            {tagName}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="flex justify-between mb-3 w-full">
                            <div className={`${baseButtonClasses} ${hoverClasses} ${isLiked ? activeClasses : ''}`} onClick={handleLike}>
                                <i className={getIconClass(isLiked, 'fa-heart')}></i>
                                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">{formatNumber(story.likes_count || 0)}</div>
                            </div>
                            <div className={`${baseButtonClasses} ${hoverClasses} ${story.isCommented ? activeClasses : ''}`} onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                setShowCommentModal(true); 
                            }}>
                                <i className={getIconClass(story.isCommented, 'fa-comment')}></i>
                                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">{formatNumber(localCommentsCount || 0)}</div>
                            </div>
                            <div className={`${baseButtonClasses} ${hoverClasses}`} onClick={() => setShowShareModal(true)}>
                                <i className="fas fa-share text-[18px] text-white"></i>
                                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">{formatNumber(story.shares_count || 0)}</div>
                            </div>
                            <div className={`${baseButtonClasses} ${hoverClasses} ${isSaved ? activeClasses : ''}`} onClick={handleSave}>
                                <i className={getIconClass(isSaved, 'fa-bookmark')}></i>
                            </div>
                        </div>
                        
                        <div className="creator-chip flex items-center gap-3 bg-white/10 py-1 px-1 rounded-full border border-white/20 max-w-full overflow-hidden">
                            {/* Avatar container with follow button */}
                            <div className="relative flex-shrink-0" style={{ width: '3.25rem', height: '3.25rem' }}>
                                <a href={`/${encodeURIComponent(getCreatorUsername())}`} className="block w-full h-full">
                                    <div className="creator-avatar w-full h-full rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer overflow-hidden">
                                        {getCreatorProfileImageUrl() ? (
                                            <img src={getCreatorProfileImageUrl()} alt={`${getCreatorDisplayName()}'s profile`} className="w-full h-full object-cover" />
                                        ) : (
                                            getCreatorInitial()
                                        )}
                                    </div>
                                </a>
                                
                                {/* TikTok-style follow button - only show if not owner, not already following, and not anonymous */}
                                {!isOwner && !isFollowing && getCreatorUsername() !== 'anonymous' && (
                                    <button 
                                        className="follow-button"
                                        onClick={handleFollow}
                                    >
                                        <i className="fas fa-plus text-white text-xs"></i>
                                    </button>
                                )}
                            </div>
                            
                            {/* Creator name */}
                            <div className="flex flex-col flex-grow min-w-0 ml-0.5" style={{ minWidth: '0' }}>
                                <a href={`/${encodeURIComponent(getCreatorUsername())}`} className="block min-w-0">
                                    <span className="creator-name text-xs sm:text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis hover:underline block max-w-[6.5rem]" style={{ lineHeight: '1.1' }} title={getCreatorDisplayName()}>
                                        {getCreatorDisplayName()}
                                    </span>
                                </a>
                                {/* Timestamp */}
                                {story.created_at && (
                                    <span className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate block max-w-[6.5rem]" title={new Date(story.created_at).toLocaleString()}>
                                        {formatTimeAgo(story.created_at)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    className="verses-btn relative py-3 px-6 rounded-full font-bold text-base border-none cursor-pointer transition-all hover:scale-105 uppercase tracking-widest flex items-center gap-2 flex-shrink-0 overflow-hidden"
                                    style={{ 
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4, #ec4899, #f59e0b)',
                                        backgroundSize: '400% 400%',
                                        animation: 'gradientMove 3s ease infinite',
                                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.4)'
                                    }}
                                    onClick={handleOpenVerses}
                                >
                                    <span 
                                        className="relative z-10 font-extrabold"
                                        style={{
                                            background: 'linear-gradient(90deg, #ffffff, #ffd700, #00ffff, #ff00ff, #ffffff)',
                                            backgroundSize: '200% 200%',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            animation: 'textGradientMove 2s linear infinite'
                                        }}
                                    >
                                        Verses
                                    </span>
                                    <span className="verse-count bg-black/30 text-white text-xs font-bold py-0.5 px-1.5 rounded-full ml-1 relative z-10">
                                        {Array.isArray(story.verses) ? story.verses.length : 0}
                                    </span>
                                    
                                    {/* Animated border effect */}
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-pulse"></div>
                                        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                        <div className="absolute inset-0 rounded-full border-2 border-purple-400/50 animate-pulse" style={{ animationDelay: '1s' }}></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent h-px w-full animate-pulse"></div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Swipe indicator for stories */}
                    <div className="story-swipe-indicator"></div>
                </div>
                
                {/* Modals */}
                {/* StoryFormModal for editing story */}
                {showStoryFormModal && (
                    <StoryFormModal
                        isOpen={showStoryFormModal}
                        onClose={() => setShowStoryFormModal(false)}
                        editingStory={story}
                        mode="edit"
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
                            }
                        }}
                    />
                )}
                
                            {showVerseViewer && (
    <VerseViewer
        isOpen={showVerseViewer}
        onClose={() => {
            setShowVerseViewer(false);
            // Clean up
            delete window.__fullStoryForViewer;
        }}
        story={window.__fullStoryForViewer || story}
        initialVerseIndex={0}
    />
)}
                
         
                
                {/* Share Modal */}
                {showShareModal && (
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        shareData={shareData}
                        imageUrl={coverImageUrl}
                        isVerse={false}
                    />
                )}
                
                {/* Contribute Modal */}
                {showContributeModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center ">
                        <div className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative flex flex-col">
                            {/* Animated neon border effect */}
                            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                                <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
                                <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
                            </div>
                            
                            {/* Header */}
                            <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-8 py-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
                                            <i className="fas fa-book text-cyan-400 text-2xl"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                                                CONTRIBUTE TO STORY
                                            </h2>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Add a verse to "{story.title || 'this story'}"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            type="button"
                                            title="Clear form" 
                                            className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                                            onClick={() => {
                                                setVerseContent('');
                                                setVerseImages([]);
                                            }}
                                        >
                                            <i className="fas fa-sync-alt text-lg"></i>
                                        </button>
                                        <button 
                                            onClick={() => setShowContributeModal(false)}
                                            className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                                        >
                                            <i className="fas fa-times text-xl"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="relative z-10 p-8 overflow-y-auto flex-grow custom-scrollbar" style={{ minHeight: '0' }}>
                                <div className="max-w-5xl mx-auto space-y-8">
                                    {/* Verse Content */}
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                            <i className="fas fa-pen text-purple-400"></i> Verse Content
                                            <span className="text-xs text-gray-500 ml-2">(optional)</span>
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">You can add images/moments without text — the verse text is optional.</p>
                                        <div className="relative">
                                            <textarea 
                                                placeholder="Describe your verse..."
                                                value={verseContent}
                                                onChange={(e) => setVerseContent(e.target.value)}
                                                rows={3}
                                                className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none text-lg"
                                            ></textarea>
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Verse Images */}
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                            <i className="fas fa-images text-purple-400"></i> Verse Moments (Images)
                                        </label>
                                        
                                        {verseImages.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {verseImages.map((image, index) => (
                                                    <div key={index} className="relative group">
                                                        <img 
                                                            src={image.preview} 
                                                            alt={`Verse image ${index + 1}`} 
                                                            className="w-full h-36 object-cover rounded-xl border border-gray-700"
                                                        />
                                                        <button 
                                                            onClick={() => removeImage(index)}
                                                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                            {index + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                <div className="relative h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group">
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef}
                                                        className="hidden" 
                                                        multiple 
                                                        accept="image/*" 
                                                        onChange={handleImageUpload}
                                                    />
                                                    <div 
                                                        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300 cursor-pointer"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                                                            <i className="fas fa-plus text-purple-400 text-xl"></i>
                                                        </div>
                                                        <p className="text-gray-300 text-sm">Add more</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group">
                                                <input 
                                                    type="file" 
                                                    ref={fileInputRef}
                                                    className="hidden" 
                                                    multiple 
                                                    accept="image/*" 
                                                    onChange={handleImageUpload}
                                                />
                                                <div 
                                                    className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300 cursor-pointer"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                                                        <i className="fas fa-images text-purple-400 text-xl"></i>
                                                    </div>
                                                    <p className="text-gray-300 text-sm">Add images</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-6" style={{ position: 'sticky', bottom: '0', zIndex: '20' }}>
                                <div className="flex justify-end gap-4">
                                    <button 
                                        onClick={() => setShowContributeModal(false)}
                                        className="px-8 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitContribution}
                                        disabled={isSubmitting}
                                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="fas fa-spinner animate-spin"></i>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-rocket text-xl"></i>
                                                Submit Verse
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Recommend Modal */}
                {showRecommendModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center">
                        <div className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative flex flex-col">
                            {/* Animated neon border effect */}
                            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                                <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
                                <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
                            </div>
                            
                            {/* Header */}
                            <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-8 py-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
                                            <i className="fas fa-paper-plane text-cyan-400 text-2xl"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                                                RECOMMEND STORY
                                            </h2>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Recommend "{story.title || 'this story'}" to your friends
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => {
                                                setShowRecommendModal(false);
                                                setSearchTerm('');
                                                setSelectedUsers([]);
                                            }}
                                            className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                                        >
                                            <i className="fas fa-times text-xl"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="relative z-10 p-8 overflow-y-auto flex-grow custom-scrollbar" style={{ minHeight: '0' }}>
                                <div className="max-w-5xl mx-auto space-y-8">
                                    {/* Search Bar */}
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                            <i className="fas fa-search text-purple-400"></i> Search Followers
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                placeholder="Search followers..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
                                            />
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Select All and User List */}
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                            <i className="fas fa-users text-purple-400"></i> Select Followers
                                        </label>
                                        
                                        <div className="bg-slate-900/60 border border-gray-700 rounded-2xl p-4">
                                            {/* Select All Option */}
                                            <div className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-xl transition-colors mb-2">
                                                <input 
                                                    type="checkbox"
                                                    id="select-all"
                                                    checked={selectedUsers.length === recommendUsers.length && recommendUsers.length > 0}
                                                    onChange={handleSelectAll}
                                                    className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2"
                                                />
                                                <label htmlFor="select-all" className="text-white font-medium cursor-pointer flex-1">
                                                    Select All ({recommendUsers.length} followers)
                                                </label>
                                            </div>
                                            
                                            {/* User List */}
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                {filteredUsers.length > 0 ? (
                                                    filteredUsers.map(user => (
                                                        <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-xl transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                id={`user-${user.id}`}
                                                                checked={selectedUsers.includes(user.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedUsers([...selectedUsers, user.id]);
                                                                    } else {
                                                                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                                    }
                                                                }}
                                                                className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2"
                                                            />
                                                            <label htmlFor={`user-${user.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white font-semibold">
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="text-white font-medium">{user.name}</div>
                                                                    <div className="text-gray-400 text-sm">@{user.username}</div>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8 text-gray-400">
                                                        <i className="fas fa-user-slash text-3xl mb-3"></i>
                                                        <p>No followers found matching "{searchTerm}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Selected Count */}
                                        <div className="text-right">
                                            <span className="text-cyan-400 font-medium">
                                                {selectedUsers.length} of {recommendUsers.length} selected
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-6" style={{ position: 'sticky', bottom: '0', zIndex: '20' }}>
                                <div className="flex justify-between">
                                    <button 
                                        onClick={() => {
                                            setShowRecommendModal(false);
                                            setSearchTerm('');
                                            setSelectedUsers([]);
                                        }}
                                        className="px-8 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRecommendSubmit}
                                        disabled={selectedUsers.length === 0}
                                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <i className="fas fa-paper-plane text-xl"></i>
                                        Recommend to {selectedUsers.length} {selectedUsers.length === 1 ? 'User' : 'Users'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center">
                        <div className="w-full max-w-md bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-red-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative">
                            {/* Animated neon border effect */}
                            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                                <div className="absolute inset-0 rounded-3xl border-2 border-red-500/30 animate-pulse"></div>
                                <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent h-px w-full animate-pulse"></div>
                            </div>
                            
                            {/* Header */}
                            <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md px-8 py-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 to-pink-600/30 flex items-center justify-center shadow-lg shadow-red-500/40 border border-red-500/30">
                                        <i className="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            Delete Story
                                        </h2>
                                        <p className="text-gray-400 text-sm mt-1">
                                            This action cannot be undone
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="relative z-10 p-8">
                                <p className="text-gray-300 text-lg mb-2">
                                    Are you sure you want to delete <span className="text-white font-semibold">"{story.title}"</span>?
                                </p>
                                <p className="text-gray-400 text-sm">
                                    All verses and comments will be permanently removed.
                                </p>
                            </div>
                            
                            {/* Footer */}
                            <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-6">
                                <div className="flex justify-end gap-4">
                                    <button 
                                        onClick={() => setShowDeleteModal(false)}
                                        className="px-6 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteStory}
                                        disabled={isDeleting}
                                        className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/30 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <i className="fas fa-spinner animate-spin"></i>
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-trash"></i>
                                                Delete Story
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Enlarge Modal */}
                {showEnlargeModal && (
                    <>
                        {/* Fixed buttons at the top of the screen */}
                        <div className="fixed top-4 left-4 right-4 flex justify-between z-[700] pointer-events-none">
                            <button 
                                onClick={handleDownloadImage}
                                className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 pointer-events-auto"
                                title="Download image"
                            >
                                <i className="fas fa-download"></i>
                            </button>
                            <button 
                                onClick={() => setShowEnlargeModal(false)}
                                className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 pointer-events-auto"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        {/* Image container */}
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center" onClick={() => setShowEnlargeModal(false)}>
                            <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                                {coverImageUrl ? (
                                    <img 
                                        src={coverImageUrl} 
                                        alt={story.title || 'Story cover'} 
                                        className="w-full h-full object-contain rounded-xl"
                                    />
                                ) : (
                                    <div className="w-full h-96 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                                        <div className="text-slate-600 text-5xl">
                                            <i className="fas fa-image"></i>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
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

const VerseViewer = ({ 
  isOpen, 
  onClose, 
  story, 
  initialVerseIndex = 0 
}) => {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(initialVerseIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  const verseRefs = useRef([]);
  const containerRef = useRef(null);
  
  // Get current verse
  const currentVerse = story?.verses?.[currentVerseIndex] || null;
  
  // Initialize verse data
  useEffect(() => {
    if (currentVerse) {
      setIsLiked(currentVerse.user_has_liked || false);
      setLikeCount(currentVerse.likes_count || 0);
      setCurrentMomentIndex(0);
      setIsContentExpanded(false);
      // Log current verse moments for debugging
      try {
        console.debug('[VerseViewer] currentVerse changed', {
          verseId: currentVerse.id,
          verseSlug: currentVerse.slug,
          momentsCount: Array.isArray(currentVerse.moments) ? currentVerse.moments.length : (currentVerse.moments ? 1 : 0),
          momentsSample: Array.isArray(currentVerse.moments) ? currentVerse.moments.slice(0,5) : currentVerse.moments
        });
      } catch (e) {
        console.warn('[VerseViewer] failed logging currentVerse moments', e);
      }
    }
  }, [currentVerse]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentVerseIndex(initialVerseIndex);
      setIsContentExpanded(false);
      // Scroll to initial verse
      setTimeout(() => {
        if (verseRefs.current[initialVerseIndex]) {
          verseRefs.current[initialVerseIndex].scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      // Log story and initial verse moments for debugging
      try {
        console.debug('[VerseViewer] opened', {
          storySlug: story?.slug,
          totalVerses: Array.isArray(story?.verses) ? story.verses.length : 0,
          initialVerseIndex,
          initialVerse: story?.verses?.[initialVerseIndex]
        });
        const initialMoments = story?.verses?.[initialVerseIndex]?.moments;
        console.debug('[VerseViewer] initial moments:', initialMoments);
      } catch (e) {
        console.warn('[VerseViewer] logging error on open', e);
      }
    }
  }, [isOpen, initialVerseIndex]);

  // Handle scroll events to detect current verse
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Determine which verse is currently in view
      for (let i = 0; i < verseRefs.current.length; i++) {
        const verse = verseRefs.current[i];
        if (verse) {
          const verseTop = verse.offsetTop;
          const verseHeight = verse.offsetHeight;
          
          if (scrollTop >= verseTop - containerHeight/2 && 
              scrollTop < verseTop + verseHeight - containerHeight/2) {
            if (currentVerseIndex !== i) {
              setCurrentVerseIndex(i);
            }
            break;
          }
        }
      }
    };

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
      return () => containerElement.removeEventListener('scroll', handleScroll);
    }
  }, [currentVerseIndex]);

  // Handle like action
  const handleLike = async () => {
    if (!currentVerse) return;
    
    // Optimistic UI update
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? likeCount + 1 : Math.max(0, likeCount - 1);
    
    setIsLiked(newLikedState);
    setLikeCount(newLikeCount);
    
    try {
      // Use the backend interact endpoint; it expects { type: 'LIKE' }
      const response = await fetch(`/api/verses/${currentVerse.slug}/interact/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ type: 'LIKE' }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        // Revert UI change if API call fails
        setIsLiked(!newLikedState);
        setLikeCount(likeCount);
        throw new Error('Failed to toggle like');
      }
      
  const data = await response.json();

  // Backend may return different shapes; handle both
  const serverLiked = data.user_has_liked ?? data.is_liked ?? null;
  const serverCount = data.count ?? data.likes_count ?? null;

  if (serverLiked !== null) setIsLiked(!!serverLiked);
  if (serverCount !== null) setLikeCount(Number(serverCount));
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem(`verse_${currentVerse.id}_liked`, data.is_liked);
        localStorage.setItem(`verse_${currentVerse.id}_count`, data.likes_count);
      } catch (e) {
        console.warn('Failed to store like state:', e);
      }
      
    } catch (error) {
      console.error('Error toggling verse like:', error);
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
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Handle horizontal scroll for moments
  const handleMomentScroll = (e) => {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    // Calculate which moment is in view
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
  };

  // Helper function to get CSRF token
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  };

  // Generate a title from content for display
  const generateTitleFromContent = (content) => {
    if (!content) return 'Untitled Verse';
    
    // Extract first sentence or first 50 characters
    const sentences = content.split(/[.!?]+/);
    if (sentences.length > 0 && sentences[0].trim().length > 0) {
      const firstSentence = sentences[0].trim();
      return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
    }
    
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  // Check if content has more than 3 lines
  const hasMoreLines = (content) => {
    if (!content) return false;
    
    // Create a temporary element to measure line height
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.width = '300px'; // Approximate width of content area
    tempElement.style.whiteSpace = 'pre-wrap';
    tempElement.style.wordWrap = 'break-word';
    tempElement.textContent = content;
    
    document.body.appendChild(tempElement);
    const lineHeight = parseInt(window.getComputedStyle(tempElement).lineHeight);
    const height = tempElement.offsetHeight;
    document.body.removeChild(tempElement);
    
    return height > lineHeight * 3;
  };

  if (!isOpen || !story) return null;

  return (
    <div className="fixed inset-0 z-[201] bg-black">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-4">
        <div className="flex justify-between items-center">
          <div className="text-white font-medium">
            {story.title} - Verse {currentVerseIndex + 1} of {story.verses.length}
          </div>
          <button 
            className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-all"
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 z-50" 
           style={{ width: `${((currentVerseIndex + 1) / story.verses.length) * 100}%` }}></div>
      
      {/* Vertical scroll container for verses */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {story.verses.map((verse, index) => (
          <div 
            key={verse.id}
            ref={el => verseRefs.current[index] = el}
            className="h-screen w-full snap-start flex flex-col relative"
          >
            {/* Moments (horizontal scroll) */}
            {verse.moments && verse.moments.length > 0 ? (
              <div className="flex-1 flex items-center justify-center bg-black">
                <div 
                  className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  onScroll={handleMomentScroll}
                >
                  {verse.moments.map((moment, momentIndex) => {
                    // allow moments that are strings or objects
                    const imageUrl = getMomentImageUrl(moment);
                    const key = moment && (moment.id || momentIndex);
                    return (
                      <div key={key} className="flex-shrink-0 w-full h-full snap-center moment-item">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`Verse moment ${momentIndex + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : moment && moment.content ? (
                          <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="text-white text-2xl text-center">
                              {moment.content}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="text-gray-400 text-sm text-center">No moment available</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Horizontal scroll indicator */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                  {verse.moments.map((_, momentIndex) => (
                    <div 
                      key={momentIndex} 
                      className={`w-2 h-2 rounded-full ${momentIndex === currentMomentIndex ? 'bg-cyan-500' : 'bg-gray-600'}`}
                    ></div>
                  ))}
                </div>
              </div>
            ) : (
              /* If no moments, show verse content as the main content */
              <div className="flex-1 flex items-center justify-center bg-black p-8">
                <div className="text-white text-2xl text-center max-w-3xl">
                  {verse.content || 'No content for this verse'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Fixed Content Area (overlays on top of moments) */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">
            {generateTitleFromContent(currentVerse?.content)}
          </h1>
          
          {currentVerse?.content && (
            <div className="text-white">
              <div 
                className={`overflow-hidden transition-all duration-300 ${isContentExpanded ? 'max-h-96' : 'max-h-16'}`}
              >
                {currentVerse.content}
              </div>
              
              {hasMoreLines(currentVerse.content) && (
                <button 
                  className="text-cyan-400 mt-2 text-sm"
                  onClick={() => setIsContentExpanded(!isContentExpanded)}
                >
                  {isContentExpanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent p-4">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base">
              {currentVerse?.author?.username?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="text-white">
              <div className="font-semibold">{currentVerse?.author?.username || 'Poster Name'}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button 
              className="flex items-center gap-2 text-white cursor-pointer transition-all hover:scale-110" 
              onClick={handleLike}
            >
              <i className={`${isLiked ? 'fas text-red-400' : 'far'} text-2xl`}></i>
              <span className="text-base font-medium">{likeCount}</span>
            </button>
            
            {/* Share Button */}
            <button 
              className="flex items-center gap-2 text-white cursor-pointer transition-all hover:scale-110"
              onClick={handleShare}
            >
              <i className="fas fa-share text-2xl"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerseViewer;