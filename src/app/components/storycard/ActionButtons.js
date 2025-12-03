'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber } from '../../../../lib/utils';
import { storiesApi } from '../../../../lib/api';

const ActionButtons = ({ 
    story, 
    localCommentsCount, 
    setShowCommentModal, 
    setShowShareModal
}) => {
    // Local state for like and save toggles with persistence
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [likeCount, setLikeCount] = useState(story?.likes_count || 0);

    // Initialize state from localStorage on mount
    useEffect(() => {
        if (!story?.id) return;
        
        const savedLikes = JSON.parse(localStorage.getItem('storyLikes') || '{}');
        const savedSaves = JSON.parse(localStorage.getItem('storySaves') || '{}');
        const savedLikeCounts = JSON.parse(localStorage.getItem('storyLikeCounts') || '{}');
        
        // Restore like/save states
        setIsLiked(savedLikes[story.id] || false);
        setIsSaved(savedSaves[story.id] || false);
        
        // Restore like count from localStorage if it exists, otherwise use API count
        if (savedLikeCounts[story.id] !== undefined) {
            setLikeCount(savedLikeCounts[story.id]);
        } else {
            setLikeCount(story?.likes_count || 0);
        }
    }, [story?.id, story?.likes_count]);

    const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative transition-all duration-200';
    const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
    const inactiveClasses = 'border border-white/20';
    const activeClasses = 'bg-[#ff6b35]/20 border-2 border-[#ff6b35]';

    // Handle like toggle with persistence
    const handleLikeToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!story?.id || isLoading) return;
        
        setIsLoading(true);
        const newLikeState = !isLiked;
        const countChange = newLikeState ? 1 : -1;
        const newCount = Math.max(0, likeCount + countChange);
        
        try {
            // Optimistically update UI
            setIsLiked(newLikeState);
            setLikeCount(newCount);
            
            // Persist to localStorage
            const savedLikes = JSON.parse(localStorage.getItem('storyLikes') || '{}');
            const savedLikeCounts = JSON.parse(localStorage.getItem('storyLikeCounts') || '{}');
            
            savedLikes[story.id] = newLikeState;
            savedLikeCounts[story.id] = newCount;
            
            localStorage.setItem('storyLikes', JSON.stringify(savedLikes));
            localStorage.setItem('storyLikeCounts', JSON.stringify(savedLikeCounts));
            
            // Sync with backend API
            await storiesApi.toggleStoryLike(story.id);
        } catch (error) {
            // Revert on error
            setIsLiked(!newLikeState);
            setLikeCount(likeCount);
            const savedLikes = JSON.parse(localStorage.getItem('storyLikes') || '{}');
            const savedLikeCounts = JSON.parse(localStorage.getItem('storyLikeCounts') || '{}');
            delete savedLikes[story.id];
            delete savedLikeCounts[story.id];
            localStorage.setItem('storyLikes', JSON.stringify(savedLikes));
            localStorage.setItem('storyLikeCounts', JSON.stringify(savedLikeCounts));
            console.error('Failed to toggle like:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle save toggle with persistence
    const handleSaveToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!story?.id || isLoading) return;
        
        setIsLoading(true);
        const newSaveState = !isSaved;
        
        try {
            // Optimistically update UI
            setIsSaved(newSaveState);
            
            // Persist to localStorage
            const savedSaves = JSON.parse(localStorage.getItem('storySaves') || '{}');
            savedSaves[story.id] = newSaveState;
            localStorage.setItem('storySaves', JSON.stringify(savedSaves));
            
            // Sync with backend API
            await storiesApi.toggleStorySave(story.id);
        } catch (error) {
            // Revert on error
            setIsSaved(!newSaveState);
            const savedSaves = JSON.parse(localStorage.getItem('storySaves') || '{}');
            delete savedSaves[story.id];
            localStorage.setItem('storySaves', JSON.stringify(savedSaves));
            console.error('Failed to toggle save:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex justify-between mb-3 w-full gap-2">
            {/* LIKE button - Toggle state on click with persistence */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${isLiked ? activeClasses : inactiveClasses} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={handleLikeToggle}
                role="button"
                tabIndex={0}
                aria-label={isLiked ? "Unlike story" : "Like story"}
                onKeyPress={(e) => e.key === 'Enter' && handleLikeToggle(e)}
            >
                <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[18px] ${isLiked ? 'text-[#ff6b35]' : 'text-white'} ${isLiked ? 'animate-pulse' : ''}`}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10 transition-all duration-200">
                    {formatNumber(likeCount)}
                </div>
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
                <i className="far fa-comment text-[18px] text-white"></i>
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

            {/* SAVE button - Toggle state on click with persistence */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${isSaved ? activeClasses : inactiveClasses} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={handleSaveToggle}
                role="button"
                tabIndex={0}
                aria-label={isSaved ? "Remove from saved" : "Save story"}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveToggle(e)}
            >
                <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-[18px] ${isSaved ? 'text-[#ff6b35]' : 'text-white'} ${isSaved ? 'animate-pulse' : ''}`}></i>
            </div>
        </div>
    );
};

export default ActionButtons;