// CreatorChip.js - Fixed version with proper follow state handling
import React from 'react';

const CreatorChip = ({ 
    story, 
    isOwner, 
    isFollowing,  // This comes from parent's state
    handleFollow, 
    handleOpenVerses,
    getCreatorDisplayName, 
    getCreatorUsername, 
    getCreatorProfileImageUrl, 
    getCreatorInitial 
}) => {
    const creatorUsername = getCreatorUsername();
    
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
                {!isOwner && !isFollowing && creatorUsername !== 'anonymous' && (
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
                        {new Date(story.created_at).toLocaleString()}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button 
                    className="verses-btn relative py-4 px-5 rounded-full font-bold text-base cursor-pointer transition-all hover:scale-105 uppercase tracking-widest flex items-center gap-2 flex-shrink-0 overflow-hidden"
                    onClick={handleOpenVerses}
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
            </div>
        </div>
    );
};

export default CreatorChip;