// CreatorChip.js - Fixed version with proper follow state handling
import React from 'react';
import { formatTimeAgo } from '../../../../lib/utils';
import { useAuth } from '../../../../contexts/AuthContext';

const CreatorChip = ({ 
    story, 
    isOwner, 
    isFollowing,  // This comes from parent's state
    handleFollow, 
    handleOpenVerses,
    isViewerOpening = false,
    getCreatorDisplayName, 
    getCreatorUsername, 
    getCreatorProfileImageUrl, 
    getCreatorInitial 
}) => {
    const { currentUser } = useAuth();
    const creatorUsername = getCreatorUsername();
    const isSelf = !!(currentUser && currentUser.username && currentUser.username === creatorUsername);
    
    const handleFollowClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Call parent's handleFollow - parent manages the state
        await handleFollow(e, creatorUsername);
    };
    
    return (
        <div className="creator-chip flex items-center gap-3 bg-white/10 py-1 px-1 rounded-full border border-white/20 max-w-full overflow-hidden">
            <div className="relative flex-shrink-0" style={{ width: '3.25rem', height: '3.25rem' }}>
                <a href={`/${encodeURIComponent(creatorUsername)}`} className="block w-full h-full">
                    <div className="creator-avatar w-full h-full rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer overflow-hidden">
                        {getCreatorProfileImageUrl() ? (
                            <img src={getCreatorProfileImageUrl()} alt={`${getCreatorDisplayName()}'s profile`} className="w-full h-full object-cover" />
                        ) : (
                            getCreatorInitial()
                        )}
                    </div>
                </a>
                
                {/* TikTok-style follow button - show only if NOT following */}
                {!isOwner && !isFollowing && !isSelf && creatorUsername !== 'anonymous' && (
                    <button 
                        className="follow-button absolute bottom-0 right-0 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
                        onClick={handleFollowClick}
                    >
                        <i className="fas fa-plus text-white text-xs"></i>
                    </button>
                )}
            </div>
            
            <div className="flex flex-col flex-grow min-w-0 ml-0.5">
                <a href={`/${encodeURIComponent(creatorUsername)}`} className="block min-w-0">
                    <span className="creator-name text-xs sm:text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis hover:underline block max-w-[6.5rem]" title={getCreatorDisplayName()}>
                        {getCreatorDisplayName()}
                    </span>
                </a>
                {story.created_at && (
                    <span className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate block max-w-[6.5rem]" title={new Date(story.created_at).toLocaleString()}>
                        {formatTimeAgo(story.created_at)}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <div className="relative" style={{ display: 'inline-block' }}>
                    <button 
                        className="verses-btn relative py-4 px-5 rounded-full font-bold text-base cursor-pointer transition-all hover:scale-105 uppercase tracking-widest flex items-center gap-2 flex-shrink-0 overflow-hidden"
                        onClick={handleOpenVerses}
                        aria-busy={isViewerOpening}
                    >
                        <div 
                            className="absolute inset-0 rounded-full"
                            style={{ background: 'linear-gradient(45deg, #f97316, #ec4899, #3b82f6)' }}
                        ></div>
                        <span className="verses-text relative z-10 font-extrabold text-sm text-white">
                            Verses
                        </span>
                        <span className="verse-count bg-black/20 backdrop-blur-sm text-white text-xs font-bold py-0.5 px-1.5 rounded-full ml-1 relative z-10">
                            {Array.isArray(story.verses) ? story.verses.length : 0}
                        </span>
                    </button>

                    {/* Animated colorful ring shown while the viewer is opening */}
                    {isViewerOpening && (
                        <div className="absolute -inset-1 z-20 pointer-events-none flex items-center justify-center">
                            <svg className="w-full h-full animate-rotate" viewBox="0 0 48 48" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#f97316" />
                                        <stop offset="50%" stopColor="#ec4899" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                                <circle cx="24" cy="24" r="20" fill="none" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 20" />
                            </svg>
                        </div>
                    )}
                </div>
                
                {/* Inline styles for the small rotation animation */}
                <style>{`
                    @keyframes rotate {
                        to { transform: rotate(360deg); }
                    }
                    .animate-rotate { animation: rotate 1.2s linear infinite; transform-origin: 50% 50%; }
                `}</style>
            </div>
        </div>
    );
};

export default CreatorChip;