'use client';

import React, { useEffect } from 'react';
import { formatNumber } from '../../../../lib/utils';
import useUserInteractions from '../../../../hooks/useUserInteractions';

const ActionButtons = ({ 
    story, 
    localCommentsCount, 
    setShowCommentModal, 
    setShowShareModal
}) => {
    const {
        isLiked,
        isSaved,
        likeCount,
        isLikeLoading,
        isSaveLoading,
        toggleLike,
        toggleSave,
        initializeLikeCount,
    } = useUserInteractions(story.id);

    // Initialize like count from story
    useEffect(() => {
        initializeLikeCount(story.likes_count || 0);
    }, [story.id, story.likes_count, initializeLikeCount]);

    const handleLikeClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleLike(likeCount);
    };

    const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleSave();
    };

    const getIconClass = (iconType, isActive) => {
        return `${isActive ? 'fas' : 'far'} ${iconType} text-[18px] ${isActive ? 'text-[#ff6b35]' : 'text-white'}`;
    };

    const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative transition-all duration-200';
    const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
    const inactiveClasses = 'border border-white/20';
    const activeClasses = 'bg-[#ff6b35]/20 border-2 border-[#ff6b35]';
    const loadingClasses = 'opacity-70 cursor-not-allowed';

    return (
        <div className="flex justify-between mb-3 w-full gap-2">
            {/* LIKE button - Instagram style */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${isLiked ? activeClasses : inactiveClasses} ${isLikeLoading ? loadingClasses : ''}`}
                onClick={handleLikeClick}
                role="button"
                tabIndex={0}
                aria-label={isLiked ? "Unlike story" : "Like story"}
                onKeyPress={(e) => e.key === 'Enter' && handleLikeClick(e)}
                disabled={isLikeLoading}
            >
                <i className={`${getIconClass('fa-heart', isLiked)} ${isLiked ? 'animate-pulse' : ''}`}></i>
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

            {/* SAVE button - Instagram style */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${isSaved ? activeClasses : inactiveClasses} ${isSaveLoading ? loadingClasses : ''}`}
                onClick={handleSaveClick}
                role="button"
                tabIndex={0}
                aria-label={isSaved ? "Remove from saved" : "Save story"}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveClick(e)}
                disabled={isSaveLoading}
            >
                <i className={`${getIconClass('fa-bookmark', isSaved)} ${isSaved ? 'animate-pulse' : ''}`}></i>
            </div>
        </div>
    );
};

export default ActionButtons;