'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber } from '../../../../lib/utils';
import { storiesApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';

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

    const { currentUser } = useAuth();

    // Build per-user storage key prefix. Falls back to 'anon' for unauthenticated users.
    const userKey = (currentUser && (currentUser.username || currentUser.id)) || 'anon';
    const keyPrefix = `storyvermo:${userKey}`;

    // Initialize state from localStorage on mount and whenever user changes
    useEffect(() => {
        if (!story?.id || typeof window === 'undefined') return;

        const safeParse = (val) => {
            try {
                return JSON.parse(val || '{}');
            } catch (e) {
                return {};
            }
        };

        const savedLikes = safeParse(localStorage.getItem(`${keyPrefix}:storyLikes`));
        const savedSaves = safeParse(localStorage.getItem(`${keyPrefix}:storySaves`));
        // Restore like/save states (default false). Do NOT persist like counts per-user —
        // like counts are global and should come from the server.
        setIsLiked(Boolean(savedLikes[story.id]));
        setIsSaved(Boolean(savedSaves[story.id]));

        // Use server-provided like count as authoritative when available
        setLikeCount(story?.likes_count || 0);
    }, [story?.id, story?.likes_count, keyPrefix]);

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
            
            // Persist to per-user localStorage
            const safeParse = (val) => {
                try { return JSON.parse(val || '{}'); } catch (e) { return {}; }
            };

            const savedLikes = safeParse(localStorage.getItem(`${keyPrefix}:storyLikes`));
            savedLikes[story.id] = newLikeState;
            localStorage.setItem(`${keyPrefix}:storyLikes`, JSON.stringify(savedLikes));
            
            // Sync with backend API and prefer server's authoritative values when provided
            const result = await storiesApi.toggleStoryLike(story.id);
            try {
                if (result && typeof result === 'object') {
                    // If backend returns the liked state, trust it
                    if (Object.prototype.hasOwnProperty.call(result, 'liked')) {
                        setIsLiked(Boolean(result.liked));
                        savedLikes[story.id] = Boolean(result.liked);
                        localStorage.setItem(`${keyPrefix}:storyLikes`, JSON.stringify(savedLikes));
                    }

                    // If backend returns updated like count, trust it as authoritative
                    if (Object.prototype.hasOwnProperty.call(result, 'likes_count')) {
                        const serverCount = Number(result.likes_count || 0);
                        setLikeCount(serverCount);
                    } else if (story && story.slug) {
                        // If server didn't return the count, try re-fetching the story by slug
                        try {
                            const fresh = await storiesApi.getStoryBySlug(story.slug);
                            if (fresh && Object.prototype.hasOwnProperty.call(fresh, 'likes_count')) {
                                setLikeCount(Number(fresh.likes_count || 0));
                            }
                        } catch (e) {
                            // ignore - keep optimistic count
                        }
                    }
                }
            } catch (e) {
                // If any unexpected shape, silently continue with optimistic state
            }
        } catch (error) {
            // Revert on error
            setIsLiked(!newLikeState);
            setLikeCount(likeCount);
            const safeParse = (val) => {
                try { return JSON.parse(val || '{}'); } catch (e) { return {}; }
            };
            const savedLikes = safeParse(localStorage.getItem(`${keyPrefix}:storyLikes`));
            const savedLikeCounts = safeParse(localStorage.getItem(`${keyPrefix}:storyLikeCounts`));
            delete savedLikes[story.id];
            delete savedLikeCounts[story.id];
            localStorage.setItem(`${keyPrefix}:storyLikes`, JSON.stringify(savedLikes));
            localStorage.setItem(`${keyPrefix}:storyLikeCounts`, JSON.stringify(savedLikeCounts));
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
            
            // Persist to per-user localStorage
            const safeParse = (val) => {
                try { return JSON.parse(val || '{}'); } catch (e) { return {}; }
            };
            const savedSaves = safeParse(localStorage.getItem(`${keyPrefix}:storySaves`));
            savedSaves[story.id] = newSaveState;
            localStorage.setItem(`${keyPrefix}:storySaves`, JSON.stringify(savedSaves));
            
            // Sync with backend API
            await storiesApi.toggleStorySave(story.id);
        } catch (error) {
            // Revert on error
            setIsSaved(!newSaveState);
            const safeParse = (val) => {
                try { return JSON.parse(val || '{}'); } catch (e) { return {}; }
            };
            const savedSaves = safeParse(localStorage.getItem(`${keyPrefix}:storySaves`));
            delete savedSaves[story.id];
            localStorage.setItem(`${keyPrefix}:storySaves`, JSON.stringify(savedSaves));
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