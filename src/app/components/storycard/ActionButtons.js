'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber } from '../../../../lib/utils';
import { storiesApi } from '../../../../lib/api';

const ActionButtons = ({ 
    story, 
    localCommentsCount, 
    setShowCommentModal, 
    setShowShareModal,
    isAuthenticated,
    openAuthModal,
    onStoryUpdate, // Callback to refresh parent component
    onLikeBurst // Optional callback to trigger a visual burst when liking
}) => {
    // Helper to extract liked/saved status and counts from story
    const getInitialState = (storyData) => {
        if (!storyData) return { liked: false, saved: false, count: 0 };
        
        const likedStatus = storyData.user_has_liked || storyData.is_liked || storyData.isLiked || storyData.is_liked_by_user || false;
        const savedStatus = storyData.user_has_saved || storyData.is_saved || storyData.isSaved || storyData.is_saved_by_user || false;
        const likesCount = storyData.likes_count || 0;
        
        return { liked: likedStatus, saved: savedStatus, count: likesCount };
    };
    
    // Initialize state directly from story prop - no wait for effect
    const initial = getInitialState(story);
    const [isLiked, setIsLiked] = useState(initial.liked);
    const [isSaved, setIsSaved] = useState(initial.saved);
    const [likesCount, setLikesCount] = useState(initial.count);
    
    // Loading states to prevent double-clicks
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);

    // Update state when story prop changes (e.g., after refetch)
    useEffect(() => {
        const initial = getInitialState(story);
        setIsLiked(initial.liked);
        setIsSaved(initial.saved);
        setLikesCount(initial.count);
    }, [story]);

    // Toggle like - calls backend API
    const handleLikeClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check authentication first
        if (!isAuthenticated) {
            openAuthModal?.('like');
            return;
        }

        // Prevent double-clicks
        if (isLikeLoading) {
            return;
        }

        // Capture previous state so we can correctly revert on error
        const wasLiked = isLiked;
        const prevLikesCount = likesCount;

        try {
            // Mark loading first so UI can apply immediate fill without transition
            setIsLikeLoading(true);

            // Optimistic UI update (instant visual change)
            setIsLiked(!wasLiked);
            // Trigger optional visual burst only when liking (not unliking)
            if (!wasLiked) {
                try { onLikeBurst && onLikeBurst(); } catch (e) { /* ignore */ }
            }
            setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

            // Call backend API
            const response = await storiesApi.toggleLike(story.slug);

            // Update with actual server response
            const newLikedStatus = response.is_liked || response.isLiked || response.user_has_liked || !wasLiked;
            setIsLiked(newLikedStatus);
            setLikesCount(typeof response.likes_count !== 'undefined' ? response.likes_count : prevLikesCount);

            // Optionally refresh parent component
            if (onStoryUpdate) {
                await onStoryUpdate();
            }

        } catch (error) {

            // Revert optimistic update on error using captured values
            setIsLiked(wasLiked);
            setLikesCount(prevLikesCount);

            alert('Failed to update like. Please try again.');
        } finally {
            setIsLikeLoading(false);
        }
    };
    
    // Toggle save - calls backend API
    const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check authentication first
        if (!isAuthenticated) {
            openAuthModal?.('save');
            return;
        }

        // Prevent double-clicks
        if (isSaveLoading) {
            return;
        }

        const wasSaved = isSaved;
        try {
            // Mark loading so fill is applied instantly without transition
            setIsSaveLoading(true);

            // Optimistic UI update (instant)
            setIsSaved(!wasSaved);

            // Call backend API (use slug and existing storiesApi.toggleSave)
            const response = await storiesApi.toggleSave(story.slug);

            // Update with actual server response
            const newSavedStatus = response.is_saved || response.isSaved || response.user_has_saved || !wasSaved;
            setIsSaved(newSavedStatus);

            // Optionally refresh parent component
            if (onStoryUpdate) {
                await onStoryUpdate();
            }

        } catch (error) {

            // Revert optimistic update on error
            setIsSaved(wasSaved);

            alert('Failed to update save status. Please try again.');
        } finally {
            setIsSaveLoading(false);
        }
    };

    const getIconClass = (iconType, isActive) => {
        return `${isActive ? 'fas' : 'far'} ${iconType} text-[18px] ${isActive ? 'text-[#ff6b35]' : 'text-white'}`;
    };

    const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative transition-all duration-200';
    const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
    const inactiveClasses = 'border border-white/20';
    const activeClasses = 'bg-[#ff6b35]/20 border-2 border-[#ff6b35]';
    const loadingClasses = 'opacity-50 cursor-not-allowed';

    // Compute classes so we can remove transition while the action is loading (makes fill instant)
    const likeButtonClasses = `${baseButtonClasses} ${hoverClasses} ${isLiked ? activeClasses : inactiveClasses} ${isLikeLoading ? 'transition-none' : ''}`;
    const saveButtonClasses = `${baseButtonClasses} ${hoverClasses} ${isSaved ? activeClasses : inactiveClasses} ${isSaveLoading ? 'transition-none' : ''}`;

    return (
        <div className="flex justify-between mb-3 w-full gap-2">
            {/* LIKE button - Connected to backend */}
            <div 
                className={likeButtonClasses}
                onClick={handleLikeClick}
                role="button"
                tabIndex={0}
                aria-label={isLiked ? "Unlike story" : "Like story"}
                aria-busy={isLikeLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleLikeClick(e)}
            >
                <i className={`${getIconClass('fa-heart', isLiked)}`}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10 transition-all duration-200">
                    {formatNumber(likesCount)}
                </div>
                {/* Debug indicator - remove in production */}
                {isLiked && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" 
                         title="You liked this"></div>
                )}
            </div>

            {/* COMMENT button */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${inactiveClasses}`} 
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    setShowCommentModal(true); 
                }}
                role="button"
                tabIndex={0}
                aria-label="View comments"
                onKeyPress={(e) => e.key === 'Enter' && setShowCommentModal(true)}
            >
                <i className={getIconClass('fa-comment', false)}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
                    {formatNumber(localCommentsCount || 0)}
                </div>
            </div>
            
            {/* SHARE button */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${inactiveClasses}`} 
                onClick={() => setShowShareModal(true)}
                role="button"
                tabIndex={0}
                aria-label="Share story"
                onKeyPress={(e) => e.key === 'Enter' && setShowShareModal(true)}
            >
                <i className="fas fa-share text-[18px] text-white"></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
                    {formatNumber(story.shares_count || 0)}
                </div>
            </div>

            {/* SAVE button - Connected to backend */}
            <div 
                className={saveButtonClasses}
                onClick={handleSaveClick}
                role="button"
                tabIndex={0}
                aria-label={isSaved ? "Remove from saved" : "Save story"}
                aria-busy={isSaveLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveClick(e)}
            >
                <i className={`${getIconClass('fa-bookmark', isSaved)}`}></i>
                {/* Debug indicator - remove in production */}
                {isSaved && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" 
                         title="You saved this"></div>
                )}
            </div>
        </div>
    );
};

export default ActionButtons;