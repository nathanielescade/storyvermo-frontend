// CreatorChip.js - Enhanced with loading state animation
import React from 'react';
import { formatTimeAgo } from '../../../../lib/utils';
import { useAuth } from '../../../../contexts/AuthContext';

const CreatorChip = ({ 
    story, 
    isOwner, 
    isFollowing,
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
        await handleFollow(e, creatorUsername);
    };
    
    return (
        <>
            <style>{`
                @keyframes rotate {
                    to { transform: rotate(360deg); }
                }
                
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
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                @keyframes loadingPulse {
                    0%, 100% { 
                        transform: scale(1);
                        filter: brightness(1);
                    }
                    50% { 
                        transform: scale(1.1);
                        filter: brightness(1.3);
                    }
                }
                
                @keyframes borderSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes fastGradientSwirl {
                    0% { 
                        background: linear-gradient(135deg, #3b82f6, #ec4899, #fbbf24);
                        background-size: 400% 400%;
                        background-position: 0% 50%;
                    }
                    25% { 
                        background: linear-gradient(135deg, #ec4899, #fbbf24, #8b5cf6);
                        background-size: 400% 400%;
                        background-position: 100% 50%;
                    }
                    50% { 
                        background: linear-gradient(135deg, #fbbf24, #8b5cf6, #f97316);
                        background-size: 400% 400%;
                        background-position: 100% 100%;
                    }
                    75% { 
                        background: linear-gradient(135deg, #8b5cf6, #f97316, #ec4899);
                        background-size: 400% 400%;
                        background-position: 0% 100%;
                    }
                    100% { 
                        background: linear-gradient(135deg, #f97316, #ec4899, #3b82f6);
                        background-size: 400% 400%;
                        background-position: 0% 50%;
                    }
                }
                
                .animate-rotate { 
                    animation: rotate 1.2s linear infinite; 
                    transform-origin: 50% 50%; 
                }
                
                .verses-btn-container {
                    position: relative;
                    animation: pulse 2s ease-in-out infinite;
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
                
                .verses-btn-container.loading {
                    animation: loadingPulse 0.8s ease-in-out infinite;
                }
                
                .verses-btn-container.loading::before {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 9999px;
                    background: conic-gradient(
                        from 0deg,
                        #3b82f6,
                        #8b5cf6,
                        #fbbf24,
                        #f97316,
                        #ec4899,
                        #3b82f6
                    );
                    animation: borderSpin 1s linear infinite;
                    z-index: -1;
                    opacity: 0.8;
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
                
                .verses-bg.loading {
                    animation: fastGradientSwirl 1.5s ease-in-out infinite !important;
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
                
                .shimmer-effect.loading {
                    animation: shimmer 0.8s infinite;
                }
                
                .verses-btn-container:hover {
                    animation: pulse 1s ease-in-out infinite;
                }
                
                .verses-btn-container:hover .verses-bg {
                    animation: gradientSwirl 5s ease-in-out infinite;
                }
            `}</style>
            
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
                    
                    {!isOwner && !isFollowing && !isSelf && creatorUsername !== 'anonymous' && (
                        <button 
                            className="follow-button absolute bottom-0 right-0 bg-transparent border-2 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
                            onClick={handleFollowClick}
                        >
                            <i className="fas fa-plus text-white font-extrabold text-4xl"></i>
                        </button>
                    )}
                </div>
                
                <div className="flex flex-col flex-grow min-w-0 ml-0">
                    <a href={`/${encodeURIComponent(creatorUsername)}`} className="block min-w-0">
                        <span className="creator-name text-xs sm:text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis hover:underline block max-w-[12rem]" title={getCreatorDisplayName()}>
                            {getCreatorDisplayName()}
                        </span>
                    </a>
                    {story.created_at && (
                        <span className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate block max-w-[6.5rem]" title={new Date(story.created_at).toLocaleString()}>
                            {formatTimeAgo(story.created_at)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 pl-2 pr-1"> {/* Added left padding and adjusted right padding */}
                    <div className="relative" style={{ display: 'inline-block' }}>
                        <div className={`verses-btn-container ${isViewerOpening ? 'loading' : ''}`}>
                            <button 
                                className="verses-btn relative py-4 px-3 rounded-full font-bold text-base cursor-pointer transition-all hover:scale-105 uppercase tracking-widest flex items-center gap-2 flex-shrink-0 overflow-hidden shadow-lg hover:shadow-2xl"
                                onClick={handleOpenVerses}
                                aria-busy={isViewerOpening}
                                disabled={isViewerOpening}
                            >
                                <div className={`verses-bg absolute inset-0 rounded-full ${isViewerOpening ? 'loading' : ''}`}></div>
                                <div className={`shimmer-effect rounded-full ${isViewerOpening ? 'loading' : ''}`}></div>
                                
                                <span className="verses-text relative z-10 font-extrabold text-sm text-white drop-shadow-lg">
                                    {isViewerOpening ? 'Loading...' : 'Verses'}
                                </span>
                                <span className="verse-count bg-black/30 backdrop-blur-sm text-white text-xs font-bold py-0.5 px-1.5 rounded-full ml-1 relative z-10 shadow-md">
                                    {Array.isArray(story.verses) ? story.verses.length : 0}
                                </span>
                            </button>
                        </div>

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
                </div>
            </div>
        </>
    );
};

export default CreatorChip;