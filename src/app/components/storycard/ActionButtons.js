// ActionButtons.js
import React, { useState, useEffect } from 'react';
import { storiesApi } from '../../../../lib/api';
import { formatNumber } from '../../../../lib/utils';

const ActionButtons = ({ 
    story, 
    isLiked, 
    isSaved,  
    localCommentsCount, 
    setIsLiked, 
    setIsSaved, 
    setStory, 
    setShowCommentModal, 
    setShowShareModal,
    isAuthenticated,
    openAuthModal,
    onLikeToggle, // Added this prop
    onSaveToggle  // Added this prop
}) => {
    const [optimisticLike, setOptimisticLike] = useState(isLiked);
    const [optimisticLikeCount, setOptimisticLikeCount] = useState(story.likes_count || 0);
    const [optimisticSave, setOptimisticSave] = useState(isSaved);
    const [optimisticSaveCount, setOptimisticSaveCount] = useState(story.saves_count || 0);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);

    // Sync optimistic state with actual props and story data
    useEffect(() => {
        if (story) {
            // Update optimistic state whenever story or direct props change
            setOptimisticLike(isLiked);
            setOptimisticSave(isSaved);
            setOptimisticLikeCount(story.likes_count || 0);
            setOptimisticSaveCount(story.saves_count || 0);
        }
    }, [story, isLiked, isSaved]);

    const getIconClass = (isTrue, iconType) => {
        return `${isTrue ? 'fas' : 'far'} ${iconType} text-[18px] ${isTrue ? 'text-[#ff6b35]' : 'text-white'}`;
    };

    const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative';
    const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
    const activeClasses = 'bg-[#ff6b35]/10 border-2 border-[#ff6b35]';
    const inactiveClasses = 'border border-white/20';

    const handleLike = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            if (typeof openAuthModal === 'function') {
                openAuthModal('like', { storySlug: story.slug, storyId: story.id });
            }
            return;
        }

        try {
            setIsLikeLoading(true);
            
            // Optimistically update local state
            const newLikeState = !optimisticLike;
            setOptimisticLike(newLikeState);
            setOptimisticLikeCount(prev => newLikeState ? prev + 1 : prev - 1);
            
            // Use the passed onLikeToggle function from parent
            const response = await onLikeToggle(story.id);
            
            // Update with real server state
            setOptimisticLike(response.is_liked_by_user);
            setOptimisticLikeCount(response.likes_count);
            
            // Update parent state
            setIsLiked(response.is_liked_by_user);
            setStory(prev => ({
                ...prev,
                is_liked_by_user: response.is_liked_by_user,
                likes_count: response.likes_count
            }));
        } catch (error) {
            // Revert optimistic update on error
            setOptimisticLike(isLiked);
            setOptimisticLikeCount(story.likes_count || 0);
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            if (typeof openAuthModal === 'function') {
                openAuthModal('save', { storySlug: story.slug, storyId: story.id });
            }
            return;
        }

        try {
            setIsSaveLoading(true);
            
            // Optimistically update local state
            const newSaveState = !optimisticSave;
            setOptimisticSave(newSaveState);
            setOptimisticSaveCount(prev => newSaveState ? prev + 1 : prev - 1);
            
            // Use the passed onSaveToggle function from parent
            const response = await onSaveToggle(story.id);
            
            // Update with real server state
            setOptimisticSave(response.is_saved_by_user);
            setOptimisticSaveCount(response.saves_count);
            
            // Update parent state
            setIsSaved(response.is_saved_by_user);
            setStory(prev => ({
                ...prev,
                is_saved_by_user: response.is_saved_by_user,
                saves_count: response.saves_count
            }));
        } catch (error) {
            // Revert optimistic update on error
            setOptimisticSave(isSaved);
            setOptimisticSaveCount(story.saves_count || 0);
        } finally {
            setIsSaveLoading(false);
        }
    };

    return (
        <div className="flex justify-between mb-3 w-full">
            {/* LIKE button */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${optimisticLike ? activeClasses : inactiveClasses} ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
                onClick={handleLike}
                role="button"
                tabIndex={0}
                aria-label={optimisticLike ? "Unlike story" : "Like story"}
                onKeyPress={(e) => e.key === 'Enter' && handleLike(e)}
            >
                <i className={getIconClass(optimisticLike, 'fa-heart')}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
                    {formatNumber(optimisticLikeCount)}
                </div>
            </div>

            {/* COMMENT button */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${story.isCommented ? activeClasses : inactiveClasses}`} 
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
                <i className={getIconClass(story.isCommented, 'fa-comment')}></i>
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

            {/* SAVE button */}
            <div 
                className={`${baseButtonClasses} ${hoverClasses} ${optimisticSave ? activeClasses : inactiveClasses} ${isSaveLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
                onClick={handleSave}
                role="button"
                tabIndex={0}
                aria-label={optimisticSave ? "Remove from saved" : "Save story"}
                onKeyPress={(e) => e.key === 'Enter' && handleSave(e)}
            >
                <i className={getIconClass(optimisticSave, 'fa-bookmark')}></i>
            </div>
        </div>
    );
};

export default ActionButtons; 