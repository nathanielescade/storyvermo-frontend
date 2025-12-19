// CreatorChip.js - Removed hover and click animations from verses button
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LazyImage from '../LazyImage';
import { formatTimeAgo } from '../../../../lib/utils';
import { useAuth } from '../../../../contexts/AuthContext';

const CreatorChip = ({ 
    story, 
    isOwner, 
    isFollowing: initialIsFollowing,  // Receive from parent
    handleFollow,  // Parent handles the API call
    handleOpenVerses,
    isViewerOpening = false,
    getCreatorDisplayName, 
    getCreatorUsername, 
    getCreatorProfileImageUrl, 
    getCreatorInitial 
}) => {
    const { currentUser, isAuthenticated, openAuthModal } = useAuth();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing || false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [showVerseTooltip, setShowVerseTooltip] = useState(false);
    const tooltipTimerRef = React.useRef(null);
    
    const creatorUsername = getCreatorUsername();
    const isSelf = !!(currentUser && currentUser.username && currentUser.username === creatorUsername);
    
    // Show tooltip on first visit
    useEffect(() => {
        const tooltipShown = sessionStorage.getItem('verseTooltipShown');
        if (!tooltipShown) {
            setShowVerseTooltip(true);
            sessionStorage.setItem('verseTooltipShown', 'true');
            
            // Clear any existing timer
            if (tooltipTimerRef.current) {
                clearTimeout(tooltipTimerRef.current);
            }
            
            // Hide tooltip after 5 seconds
            tooltipTimerRef.current = setTimeout(() => {
                setShowVerseTooltip(false);
                tooltipTimerRef.current = null;
            }, 5000);
        }
        
        return () => {
            if (tooltipTimerRef.current) {
                clearTimeout(tooltipTimerRef.current);
            }
        };
    }, []);
    
    // Update local state when prop changes (after parent refetches)
    useEffect(() => {
        setIsFollowing(initialIsFollowing || false);
    }, [initialIsFollowing]);

    // Clear timer when tooltip is manually closed
    useEffect(() => {
        if (!showVerseTooltip && tooltipTimerRef.current) {
            clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
        }
    }, [showVerseTooltip]);

    // Follow state is provided by parent via `initialIsFollowing` and
    // follow actions should be delegated to the parent `handleFollow`.
    // This component avoids calling the API directly.
    
    const handleFollowClick = async (e) => {
        try {
            e.preventDefault();
            e.stopPropagation();
        } catch (err) {
            // ignore
        }

        if (isFollowLoading) return;

        if (!isAuthenticated) {
            openAuthModal();
            return;
        }

        if (typeof handleFollow !== 'function') {
            return;
        }

        setIsFollowLoading(true);
        try {
            const result = handleFollow(e, creatorUsername);
            if (result && typeof result.then === 'function') {
                await result;
            }
        } catch (err) {
        } finally {
            setIsFollowLoading(false);
        }
    };
    
    return (
        <>
            <style>{`
                @keyframes gradientSwirl {
                    0% { 
                        background: linear-gradient(135deg, #3b82f6, #ec4899, #fbbf24);
                        background-size: 400% 400%;
                        background-position: 0% 50%;
                    }
                    20% {    
                        background: linear-gradient(135deg, #5b9cf6, #ff6bb3, #f97316);
                        background-size: 400% 400%;
                        background-position: 50% 50%;
                    }
                    40% { 
                        background: linear-gradient(135deg, #fbbf24, #f97316, #8b5cf6);
                        background-size: 400% 400%;
                        background-position: 100% 50%;
                    }
                    60% { 
                        background: linear-gradient(135deg, #f97316, #8b5cf6, #ec4899);
                        background-size: 400% 400%;
                        background-position: 50% 100%;
                    }
                    80% { 
                        background: linear-gradient(135deg, #8b5cf6, #ec4899, #3b82f6);
                        background-size: 400% 400%;
                        background-position: 0% 100%;
                    }
                    100% { 
                        background: linear-gradient(135deg, #3b82f6, #ec4899, #fbbf24);
                        background-size: 400% 400%;
                        background-position: 0% 50%;
                    }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                @keyframes tooltipFadeIn {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes tooltipBounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-12px);
                    }
                }

                @keyframes fadeOutTooltip {
                    0% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                    }
                }
                
                .verses-btn-container {
                    position: relative;
                    padding: 4px;
                    border-radius: 9999px;
                    background: linear-gradient(
                        90deg,
                        #3b82f6 0%,
                        #8b5cf6 20%,
                        #fbbf24 40%,
                        #f97316 60%,
                        #ec4899 80%,
                        #3b82f6 100%
                    );
                }
                
                .verses-btn {
                    position: relative;
                    background: #1a1a2e;
                }
                
                .verses-bg {
                    background: linear-gradient(135deg, #3b82f6, #ec4899, #fbbf24);
                    background-size: 400% 400%;
                    animation: gradientSwirl 8s ease-in-out infinite;
                }
                
                .shimmer-effect {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }

                .verse-tooltip {
                    position: absolute;
                    bottom: 100%;
                    right: 0;
                    background: #000000;
                    color: #ffffff;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    margin-bottom: 8px;
                    border: 1px solid #3b82f6;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                    animation: tooltipFadeIn 0.3s ease-out;
                    z-index: 50;
                    pointer-events: none;
                }

                .verse-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    right: 10px;
                    width: 0;
                    height: 0;
                    border-left: 5px solid transparent;
                    border-right: 5px solid transparent;
                    border-top: 5px solid #000000;
                }
            `}</style>
            
            <div className="creator-chip flex items-center gap-3 bg-white/10 py-1 px-1 rounded-full border border-white/20 max-w-full overflow-visible">
                <div className="relative flex-shrink-0" style={{ width: '3.25rem', height: '3.25rem' }}>
                    <Link 
                        href={`/${encodeURIComponent(creatorUsername)}`} 
                        className="block w-full h-full"
                        onMouseEnter={(e) => {
                            if (e.currentTarget.prefetch) {
                                e.currentTarget.prefetch();
                            }
                        }}
                    >
                        <div className="creator-avatar w-full h-full rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer overflow-hidden">
                            {getCreatorProfileImageUrl() ? (
                                <LazyImage src={getCreatorProfileImageUrl()} alt={`${getCreatorDisplayName()}'s profile`} fill className="object-cover rounded-full" quality={60} />
                            ) : (
                                getCreatorInitial()
                            )}
                        </div>
                    </Link>
                    
                    {/* 🔥 FIXED: Show button based on state, not localStorage */}
                    {!isOwner && !isFollowing && !isSelf && creatorUsername !== 'anonymous' && (
                        <button 
                            className={`follow-button absolute bottom-0 right-0 z-30 bg-transparent border-2 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); } catch (err) {} ; handleFollowClick(e); }}
                            disabled={isFollowLoading}
                            aria-label={isFollowLoading ? 'Following...' : 'Follow'}
                        >
                            {isFollowLoading ? (
                                <i className="fas fa-spinner fa-spin text-white text-sm"></i>
                            ) : (
                                <i className="fas fa-plus text-white font-extrabold text-xl"></i>
                            )}
                        </button>
                    )}
                </div>
                
                <div className="flex flex-col flex-grow min-w-0 ml-0">
                    <Link 
                        href={`/${encodeURIComponent(creatorUsername)}`} 
                        className="block min-w-0"
                        onMouseEnter={(e) => {
                            if (e.currentTarget.prefetch) {
                                e.currentTarget.prefetch();
                            }
                        }}
                    >
                        <span className="creator-name text-xs sm:text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis hover:underline block max-w-[12rem]" title={getCreatorDisplayName()}>
                            {getCreatorDisplayName()}
                        </span>
                    </Link>
                    {story.created_at && (
                        <span className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate block max-w-[6.5rem]" title={new Date(story.created_at).toLocaleString()}>
                            {formatTimeAgo(story.created_at)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 pl-2 pr-1">
                    <div className="relative" style={{ display: 'inline-block', position: 'relative' }}>
                        {showVerseTooltip && (
                            <div style={{
                                position: 'absolute',
                                width: '0',
                                height: '0',
                                borderLeft: '12px solid transparent',
                                borderRight: '12px solid transparent',
                                borderTop: '12px solid #ef4444',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginBottom: '4px',
                                zIndex: 9999,
                                pointerEvents: 'none',
                                animation: 'tooltipBounce 0.8s ease-in-out 3, fadeOutTooltip 0.5s ease-in 4.95s forwards'
                            }} />
                        )}
                        <div className="verses-btn-container">
                            <button 
                                className="verses-btn relative py-4 px-3 rounded-full font-bold text-base cursor-pointer uppercase tracking-widest flex items-center gap-2 flex-shrink-0 overflow-hidden shadow-lg"
                                onClick={handleOpenVerses}
                            >
                                <div className="verses-bg absolute inset-0 rounded-full"></div>
                                <div className="shimmer-effect rounded-full"></div>
                                
                                <span className="verses-text relative z-10 font-extrabold text-sm text-white drop-shadow-lg">
                                    Verses
                                </span>
                                <span className="verse-count bg-black/30 backdrop-blur-sm text-white text-xs font-bold py-0.5 px-1.5 rounded-full ml-1 relative z-10 shadow-md">
                                    {Array.isArray(story.verses) ? story.verses.length : 0}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CreatorChip;