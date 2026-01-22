"use client";

import React, { useState, useEffect } from 'react';
import { formatNumber } from '../../../../lib/utils';
import { versesApi } from '../../../../lib/api';
import { isValidUrl } from '@/utils/cdn';

const VerseActionButtons = ({ 
    verse, 
    story,
    onOpenContribute,
    handleShare,
    isAuthenticated,
    openAuthModal,
    onVerseUpdate,
    onLikeBurst
}) => {
    const getInitialState = (verseData) => {
        if (!verseData) return { liked: false, saved: false, likesCount: 0, savesCount: 0 };
        
        const likedStatus = verseData.user_has_liked || verseData.is_liked || verseData.isLiked || verseData.is_liked_by_user || false;
        const savedStatus = verseData.user_has_saved || verseData.is_saved || verseData.isSaved || verseData.is_saved_by_user || false;
        const likesCount = verseData.likes_count || 0;
        const savesCount = verseData.saves_count || 0;
        
        return { liked: likedStatus, saved: savedStatus, likesCount, savesCount };
    };
    
    const initial = getInitialState(verse);
    const [isLiked, setIsLiked] = useState(initial.liked);
    const [isSaved, setIsSaved] = useState(initial.saved);
    const [likesCount, setLikesCount] = useState(initial.likesCount);
    const [savesCount, setSavesCount] = useState(initial.savesCount);
    
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    const [showCollabNotification, setShowCollabNotification] = useState(false);
    const [showCtaText, setShowCtaText] = useState(false);

    useEffect(() => {
        const initial = getInitialState(verse);
        setIsLiked(initial.liked);
        setIsSaved(initial.saved);
        setLikesCount(initial.likesCount);
        setSavesCount(initial.savesCount);
    }, [verse]); 

    const handleLikeClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            openAuthModal?.('like');
            return;
        }

        if (isLikeLoading) return;

        const wasLiked = isLiked;
        const prevLikesCount = likesCount;

        try {
            setIsLikeLoading(true);

            // Optimistic UI update
            setIsLiked(!wasLiked);
            if (!wasLiked) {
                try { onLikeBurst && onLikeBurst(); } catch (e) { /* ignore */ }
            }
            setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

            // Update prop object directly so VerseViewer can read it in handleVerseUpdate
            if (verse) {
                verse.is_liked = !wasLiked;
                verse.user_has_liked = !wasLiked;
                verse.likes_count = wasLiked ? prevLikesCount - 1 : prevLikesCount + 1;
            }

            const response = await versesApi.toggleLikeBySlug(verse.slug);

            const newLikedStatus = response.is_liked || response.isLiked || response.user_has_liked || !wasLiked;
            const newLikesCount = typeof response.likes_count !== 'undefined' ? response.likes_count : prevLikesCount;
            
            setIsLiked(newLikedStatus);
            setLikesCount(newLikesCount);

            // Sync prop object again with server response
            if (verse) {
                verse.is_liked = newLikedStatus;
                verse.user_has_liked = newLikedStatus;
                verse.likes_count = newLikesCount;
            }

            // Notify VerseViewer to trigger parent update and re-render
            if (onVerseUpdate) {
                await onVerseUpdate(verse.id);
            }

        } catch (error) {
            setIsLiked(wasLiked);
            setLikesCount(prevLikesCount);
            // Revert prop object on error
            if (verse) {
                verse.is_liked = wasLiked;
                verse.user_has_liked = wasLiked;
                verse.likes_count = prevLikesCount;
            }
            alert('Failed to update like. Please try again.');
        } finally {
            setIsLikeLoading(false);
        }
    };
    
    const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            openAuthModal?.('save');
            return;
        }

        if (isSaveLoading) return;

        const wasSaved = isSaved;
        const prevSavesCount = savesCount;
        try {
            setIsSaveLoading(true);

            setIsSaved(!wasSaved);
            setSavesCount(prev => wasSaved ? prev - 1 : prev + 1);

            // Update prop object directly
            if (verse) {
                verse.is_saved = !wasSaved;
                verse.user_has_saved = !wasSaved;
                verse.saves_count = wasSaved ? prevSavesCount - 1 : prevSavesCount + 1;
            }

            const response = await versesApi.toggleSaveBySlug(verse.slug);

            const newSavedStatus = response.is_saved || response.isSaved || response.user_has_saved || !wasSaved;
            const newSavesCount = typeof response.saves_count !== 'undefined' ? response.saves_count : prevSavesCount;
            setIsSaved(newSavedStatus);
            setSavesCount(newSavesCount);

            // Sync prop object again
            if (verse) {
                verse.is_saved = newSavedStatus;
                verse.user_has_saved = newSavedStatus;
                verse.saves_count = newSavesCount;
            }

            if (onVerseUpdate) {
                await onVerseUpdate(verse.id);
            }

        } catch (error) {
            setIsSaved(wasSaved);
            setSavesCount(prevSavesCount);
            // Revert prop object on error
            if (verse) {
                verse.is_saved = wasSaved;
                verse.user_has_saved = wasSaved;
                verse.saves_count = prevSavesCount;
            }
            alert('Failed to update save status. Please try again.');
        } finally {
            setIsSaveLoading(false);
        }
    };

    const handleDisabledCollaborateClick = () => {
        setShowCollabNotification(true);
        setTimeout(() => {
            setShowCollabNotification(false);
        }, 2000);
    };

    const getIconClass = (iconType, isActive) => {
        return `${isActive ? 'fas' : 'far'} ${iconType} text-[18px] ${isActive ? 'text-[#ff6b35]' : 'text-white'}`;
    };

    const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative transition-all duration-200';
    const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
    const inactiveClasses = 'border border-white/20';
    const activeClasses = 'bg-[#ff6b35]/20 border-2 border-[#ff6b35]';

    const likeButtonClasses = `${baseButtonClasses} ${hoverClasses} ${isLiked ? activeClasses : inactiveClasses} ${isLikeLoading ? 'transition-none' : ''}`;
    const saveButtonClasses = `${baseButtonClasses} ${hoverClasses} ${isSaved ? activeClasses : inactiveClasses} ${isSaveLoading ? 'transition-none' : ''}`;

    return (
        <div className="flex flex-col items-center gap-3">
            {/* LIKE button (top) - HIDDEN */}
            <div 
                className={likeButtonClasses}
                onClick={handleLikeClick}
                role="button"
                tabIndex={0}
                aria-label={isLiked ? "Unlike verse" : "Like verse"}
                aria-busy={isLikeLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleLikeClick(e)}
            >
                <div className="absolute inset-0 rounded-full bg-black/30"></div>
                <i className={`${getIconClass('fa-heart', isLiked)} relative z-10`}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10 transition-all duration-200">
                    {formatNumber(likesCount)}
                </div>
                {isLiked && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" 
                         title="You liked this verse"></div>
                )}
            </div>

            {/* SHARE button */}
            <button 
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-white/20 hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110"
                onClick={handleShare}
                title="Share verse"
            >
                <div className="absolute inset-0 rounded-full bg-black/30"></div>
                <i className="fas fa-share text-[18px] text-white relative z-10"></i>
            </button>

            {/* SAVE button */}
            <div 
                className={saveButtonClasses}
                onClick={handleSaveClick}
                role="button"
                tabIndex={0}
                aria-label={isSaved ? "Remove from saved" : "Save verse"}
                aria-busy={isSaveLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveClick(e)}
            >
                <div className="absolute inset-0 rounded-full bg-black/30"></div>
                <i className={`${getIconClass('fa-bookmark', isSaved)} relative z-10`}></i>
                <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10 transition-all duration-200">
                    {formatNumber(savesCount)}
                </div>
                {isSaved && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" 
                         title="You saved this verse"></div>
                )}
            </div>

            {/* VERSE CTA button - Show link icon, on click reveal CTA text button */}
            {verse?.url && isValidUrl(verse.url) && (
                <div className="relative">
                    {!showCtaText ? (
                        // Show only link icon
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowCtaText(true);
                            }}
                            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-cyan-500/50 hover:scale-110"
                            title="Click to show CTA"
                            style={{ 
                                background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)', 
                                boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                            }}
                        >
                            <i className="fas fa-link text-white text-lg"></i>
                        </button>
                    ) : (
                        // Show CTA text button
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(verse.url, '_blank', 'noopener,noreferrer');
                                setShowCtaText(false);
                            }}
                            onBlur={() => {
                                // Hide CTA text when user clicks away
                                setTimeout(() => setShowCtaText(false), 200);
                            }}
                            className="px-4 py-2 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out border border-cyan-500/50 hover:scale-105 whitespace-nowrap text-sm font-medium text-white"
                            style={{ 
                                background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)', 
                                boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                            }}
                            autoFocus
                        >
                            <i className="fas fa-external-link-alt text-white text-sm mr-2"></i>
                            {verse.cta_text || 'Open Link'}
                        </button>
                    )}
                </div>
            )}

            {/* CONTRIBUTE button (bottom) - Bigger and with gradient like HologramIcons */}
            {story?.allow_contributions ? (
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenContribute?.();
                    }}
                    className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative group hover:scale-110"
                    title="Contribute verse"
                    style={{ 
                        background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', 
                        border: '3px solid #ff6b35', 
                        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(255, 107, 53, 0.2)'
                    }}
                >
                    <i className="fas fa-users text-white text-xl font-bold"></i>
                </button>
            ) : (
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDisabledCollaborateClick();
                    }}
                    className="w-14 h-14 rounded-full flex items-center justify-center relative group cursor-not-allowed opacity-40"
                    title="Contributions are not allowed for this story"
                    style={{ 
                        background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', 
                        border: '3px solid #ff6b35', 
                        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(255, 107, 53, 0.2)'
                    }}
                >
                    <i className="fas fa-users text-white text-xl font-bold"></i>
                </button>
            )}

            {/* Collaboration disabled notification toast */}
            {showCollabNotification && (
                <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm font-medium backdrop-blur-md border border-white/20 animate-pulse z-50">
                    Contributions are not allowed for this story
                </div>
            )}
        </div>
    );
};

export default VerseActionButtons;