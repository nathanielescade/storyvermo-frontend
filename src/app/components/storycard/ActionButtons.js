// ActionButtons.js
import React, { useState } from 'react';
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
    openAuthModal
}) => {
    const [optimisticLike, setOptimisticLike] = useState(isLiked);
    const [optimisticLikeCount, setOptimisticLikeCount] = useState(story.likes_count || 0);
    const [optimisticSave, setOptimisticSave] = useState(isSaved);
    const [optimisticSaveCount, setOptimisticSaveCount] = useState(story.saves_count || 0);

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
            // Ask user to authenticate before liking
            if (typeof openAuthModal === 'function') openAuthModal('like', { storySlug: story.slug, storyId: story.id });
            return;
        }

        // Optimistic update - update UI immediately
        const newLikeState = !optimisticLike;
        const newLikeCount = newLikeState ? optimisticLikeCount + 1 : optimisticLikeCount - 1;
        
        setOptimisticLike(newLikeState);
        setOptimisticLikeCount(newLikeCount);
        setIsLiked(newLikeState);
        
        // Update story object to reflect changes
        setStory(prev => ({
            ...prev,
            likes_count: newLikeCount,
            is_liked_by_user: newLikeState
        }));

        try {
            // Make API call to backend
            const response = await storiesApi.toggleStoryLike(story.id);
            
            // Update with the server response
            setOptimisticLike(response.is_liked_by_user);
            setOptimisticLikeCount(response.likes_count);
            setIsLiked(response.is_liked_by_user);
            
            // Update story object with server response
            setStory(prev => ({
                ...prev,
                likes_count: response.likes_count,
                is_liked_by_user: response.is_liked_by_user
            }));
        } catch (error) {
            // Revert on error
            setOptimisticLike(!newLikeState);
            setOptimisticLikeCount(optimisticLikeCount);
            setIsLiked(!newLikeState);
            
            // Revert story object
            setStory(prev => ({
                ...prev,
                likes_count: optimisticLikeCount,
                is_liked_by_user: !newLikeState
            }));
            
            console.error('Error toggling like:', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            if (typeof openAuthModal === 'function') openAuthModal('save', { storySlug: story.slug, storyId: story.id });
            return;
        }

        // Optimistic update - update UI immediately
        const newSaveState = !optimisticSave;
        const newSaveCount = newSaveState ? optimisticSaveCount + 1 : optimisticSaveCount - 1;
        
        setOptimisticSave(newSaveState);
        setOptimisticSaveCount(newSaveCount);
        setIsSaved(newSaveState);
        
        // Update story object to reflect changes
        setStory(prev => ({
            ...prev,
            saves_count: newSaveCount,
            is_saved_by_user: newSaveState
        }));

        try {
            // Make API call to backend
            const response = await storiesApi.toggleStorySave(story.id);
            
            // Update with the server response
            setOptimisticSave(response.is_saved_by_user);
            setOptimisticSaveCount(response.saves_count);
            setIsSaved(response.is_saved_by_user);
            
            // Update story object with server response
            setStory(prev => ({
                ...prev,
                saves_count: response.saves_count,
                is_saved_by_user: response.is_saved_by_user
            }));
        } catch (error) {
            // Revert on error
            setOptimisticSave(!newSaveState);
            setOptimisticSaveCount(optimisticSaveCount);
            setIsSaved(!newSaveState);
            
            // Revert story object
            setStory(prev => ({
                ...prev,
                saves_count: optimisticSaveCount,
                is_saved_by_user: !newSaveState
            }));
            
            console.error('Error toggling save:', error);
        }
    };

    return (
        <div className="flex justify-between mb-3 w-full">
            {/* LIKE button */}
            <div className={`${baseButtonClasses} ${hoverClasses} ${optimisticLike ? activeClasses : inactiveClasses}`} onClick={handleLike}>
                <i className={getIconClass(optimisticLike, 'fa-heart')}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">{formatNumber(optimisticLikeCount)}</div>
            </div>
            
            {/* COMMENT button */}
            <div className={`${baseButtonClasses} ${hoverClasses} ${story.isCommented ? activeClasses : inactiveClasses}`} onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                setShowCommentModal(true); 
            }}>
                <i className={getIconClass(story.isCommented, 'fa-comment')}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">{formatNumber(localCommentsCount || 0)}</div>
            </div>
            
            {/* SHARE button */}
            <div className={`${baseButtonClasses} ${hoverClasses} ${inactiveClasses}`} onClick={() => setShowShareModal(true)}>
                <i className="fas fa-share text-[18px] text-white"></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">{formatNumber(story.shares_count || 0)}</div>
            </div>
            
            {/* SAVE button */}
            <div className={`${baseButtonClasses} ${hoverClasses} ${optimisticSave ? activeClasses : inactiveClasses}`} onClick={handleSave}>
                <i className={getIconClass(optimisticSave, 'fa-bookmark')}></i>
            </div>
        </div>
    );
};

export default ActionButtons;