// CreatorChip.js - Separated creator info and verses button
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LazyImage from '../LazyImage';
import { formatTimeAgo } from '../../../../lib/utils';
import { useAuth } from '../../../../contexts/AuthContext';

const CreatorChip = ({ 
    story, 
    isOwner, 
    isFollowing: initialIsFollowing,
    handleFollow,
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
            
            if (tooltipTimerRef.current) {
                clearTimeout(tooltipTimerRef.current);
            }
            
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
    
    useEffect(() => {
        setIsFollowing(initialIsFollowing || false);
    }, [initialIsFollowing]);

    useEffect(() => {
        if (!showVerseTooltip && tooltipTimerRef.current) {
            clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = null;
        }
    }, [showVerseTooltip]);
    
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
                @keyframes riverFlow {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
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
                    background: linear-gradient(135deg, #3b82f6, #ec4899, #fbbf24, #f97316, #8b5cf6, #3b82f6);
                    background-size: 200% 200%;
                    animation: riverFlow 4s ease-in-out infinite;
                }
                
                .creator-chip-container {
                    position: relative;
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
                    padding: 1px;
                }
                
                .creator-chip {
                    position: relative;
                    background: #1a1a2e;
                    border-radius: 9999px;
                }
            `}</style>
            
            {/* 🔥 WRAPPER: Flex container to separate the two elements */}
            <div className="flex items-center justify-between gap-px max-w-full w-full overflow-hidden flex-shrink-0">
                
                {/* 🔥 CREATOR INFO CHIP - Colorful border container */}
                <div className="creator-chip-container flex-grow min-w-0 overflow-hidden">
                    <div className="creator-chip flex items-center gap-3 py-1 px-1 rounded-full flex-grow overflow-hidden">
                    <div className="relative flex-shrink-0" style={{ width: '2.75rem', height: '2.75rem' }}>
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
                                    <LazyImage 
                                        src={getCreatorProfileImageUrl()} 
                                        alt={`${getCreatorDisplayName()}'s profile`} 
                                        fill 
                                        className="object-cover rounded-full" 
                                        quality={60} 
                                    />
                                ) : (
                                    getCreatorInitial()
                                )}
                            </div>
                        </Link>
                        
                        {/* Follow Button */}
                        {!isOwner && !isFollowing && !isSelf && creatorUsername !== 'anonymous' && (
                            <button 
                                className={`follow-button absolute bottom-0 right-0 z-30 bg-transparent border-2 border-cyan-400 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-cyan-500/20 transition-colors ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={(e) => { 
                                    try { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                                            e.nativeEvent.stopImmediatePropagation(); 
                                        }
                                    } catch (err) {} 
                                    handleFollowClick(e); 
                                }}
                                disabled={isFollowLoading}
                                aria-label={isFollowLoading ? 'Following...' : 'Follow'}
                            >
                                {isFollowLoading ? (
                                    <i className="fas fa-spinner fa-spin text-cyan-400 text-sm"></i>
                                ) : (
                                    <i className="fas fa-plus text-cyan-400 font-extrabold text-xl"></i>
                                )}
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col flex-grow min-w-0 ml-0 pr-2 w-full">
                        <Link 
                            href={`/${encodeURIComponent(creatorUsername)}`} 
                            className="block min-w-0 w-full"
                            onMouseEnter={(e) => {
                                if (e.currentTarget.prefetch) {
                                    e.currentTarget.prefetch();
                                }
                            }}
                        >
                            <span className="creator-name text-xs sm:text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis hover:underline block w-full" title={getCreatorDisplayName()}>
                                {getCreatorDisplayName()}
                            </span>
                        </Link>
                        {story.created_at && (
                            <span className="text-[9px] sm:text-xs text-gray-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis block w-full" title={new Date(story.created_at).toLocaleString()}>
                                {formatTimeAgo(story.created_at)}
                            </span>
                        )}
                    </div>
                    </div>
                </div>

                {/* 🔥 VERSES BUTTON - Own separate border */}
                <div className="relative flex-shrink-0">
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
                            className="verses-btn relative py-4 px-2 rounded-full font-bold text-base cursor-pointer uppercase tracking-widest flex items-center gap-0.5 flex-shrink-0 overflow-hidden shadow-lg"
                            onClick={handleOpenVerses}
                        >
                            <div className="verses-bg absolute inset-0 rounded-full"></div>
                            
                            <span className="verses-text relative z-10 font-extrabold text-sm text-white drop-shadow-lg">
                                Verses
                            </span>
                            <span className="verse-count bg-black/30 backdrop-blur-sm text-white text-xs font-bold py-0.5 px-1.5 rounded-full relative z-10 shadow-md">
                                {Array.isArray(story.verses) ? story.verses.length : 0}
                            </span>
                        </button>
                    </div>
                </div>
                
            </div>
        </>
    ); 
};

export default CreatorChip;