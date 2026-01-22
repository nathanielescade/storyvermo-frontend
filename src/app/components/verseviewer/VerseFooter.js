// components/verseviewer/VerseFooter.jsx
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAuthorDisplayName, getAuthorProfileImageUrl, getAuthorInitial, getAuthorUsername, getUserId } from './utils';
import { isValidUrl } from '@/utils/cdn';

const VerseFooter = ({ 
  story, 
  currentVerse, 
  isLiked, 
  isSaved, 
  likeCount, 
  saveCount, 
  isLikeLoading, 
  isSaveLoading,
  handleLike, 
  handleSave, 
  handleShare, 
  handleOpenContribute,
  isAuthenticated,
  currentUser,
  openAuthModal,
  isFollowing,
  setIsFollowing,
  focusMode,
  showVerseOptions,
  setShowVerseOptions,
  isContribution
}) => {
  const router = useRouter();
  
  if (focusMode) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/60 backdrop-blur-lg to-transparent p-4">
      <div className="flex justify-between items-center max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: '3rem', height: '3rem' }}>
            <a
              href={`/${encodeURIComponent(getAuthorUsername(currentVerse) || '')}`}
              className="block w-full h-full"
              onClick={(e) => {
                e.preventDefault();
                const u = getAuthorUsername(currentVerse);
                if (u) router.push(`/${encodeURIComponent(u)}`);
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer overflow-hidden">
                {getAuthorProfileImageUrl(currentVerse) ? (
                  <Image 
                    src={getAuthorProfileImageUrl(currentVerse)} 
                    alt={`${getAuthorDisplayName(currentVerse)}'s profile`} 
                    width={80}
                    height={80}
                    className="w-full h-full object-cover" 
                    quality={75}
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentNode.querySelector('.author-initial-fallback');
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <span className="text-white author-initial-fallback" style={{display: getAuthorProfileImageUrl(currentVerse) ? 'none' : 'block'}}>
                  {getAuthorInitial(currentVerse)}
                </span>
              </div>
            </a>
            
            {getAuthorUsername(currentVerse) && getAuthorUsername(currentVerse) !== 'anonymous' && !isFollowing && 
             String(getUserId(currentVerse?.author || story?.creator || '')) !== String(currentUser?.public_id) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const username = getAuthorUsername(currentVerse);
                  setIsFollowing(true);
                  if (!isAuthenticated) {
                    if (typeof openAuthModal === 'function') openAuthModal('follow', username);
                    return;
                  }
                  // Follow API call would go here
                }}
                className="follow-button absolute bottom-0 right-0 rounded-full flex items-center justify-center shadow-lg transition-all hover:bg-blue-600 bg-transparent border-2 border-white w-6 h-6"
                aria-label="Follow"
                title="Follow"
              >
                <i className="fas fa-plus text-white font-extrabold text-xl"></i>
              </button>
            )}
          </div>

          <div className="text-white min-w-0 flex items-center gap-3">
            <div>
              <a
                href={`/${encodeURIComponent(getAuthorUsername(currentVerse) || '')}`}
                className="block min-w-0"
                onClick={(e) => {
                  e.preventDefault();
                  const u = getAuthorUsername(currentVerse);
                  if (u) router.push(`/${encodeURIComponent(u)}`);
                }}
              >
                {/* Fixed: Removed extra closing brace in className */}
                <span className="font-semibold text-sm truncate block max-w-[18rem]" title={getAuthorDisplayName(currentVerse)}>
                  {getAuthorDisplayName(currentVerse)}
                </span>
              </a>
              <div className={`text-xs ${isContribution ? 'text-orange-400' : 'text-cyan-300'}`}>
                {isContribution ? 'Contributed' : 'Creator'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-4 right-4 flex flex-col items-center gap-6 z-50">
          {isAuthenticated && currentUser && (() => {
            const currentUserId = String(currentUser?.public_id || currentUser?.id);
            const verseAuthorId = String(getUserId(currentVerse?.author) || '');
            const storyCreatorId = String(getUserId(story?.creator) || '');
            return currentUserId && (currentUserId === verseAuthorId || currentUserId === storyCreatorId);
          })() && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowVerseOptions(!showVerseOptions);
                }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-white/20 hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110"
                title="Options"
              >
                <i className="fas fa-ellipsis-v text-[18px] text-white"></i>
              </button>
            </div>
          )}

          <div className="flex flex-col items-center">
            <button 
              className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative ${isLiked ? 'bg-accent-orange/10 border-2 border-accent-orange' : 'border border-white/20'} hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110 ${isLikeLoading ? 'transition-none' : 'transition-all duration-200 ease-in-out'}`}
              onClick={handleLike}
              disabled={isLikeLoading}
            >
              <div className="relative">
                <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[18px] ${isLiked ? 'text-accent-orange' : 'text-white'}`}></i>
                {isLiked && (
                  <div className="absolute inset-0 rounded-full bg-accent-orange animate-ping opacity-40"></div>
                )}
              </div>
            </button>
            <span className={`text-xs mt-1 ${isLiked ? 'text-accent-orange' : 'text-white'}`}>{likeCount}</span>
          </div>
          
          <button 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative border border-white/20 hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110"
            onClick={handleShare}
          >
            <i className="fas fa-share text-[18px] text-white"></i>
          </button>
          
          <div className="flex flex-col items-center">
            <button 
              className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative ${isSaved ? 'bg-accent-orange/10 border-2 border-accent-orange' : 'border border-white/20'} hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-110 ${isSaveLoading ? 'transition-none' : 'transition-all duration-200 ease-in-out'}`}
              onClick={handleSave}
              disabled={isSaveLoading}
            >
              <div className="relative">
                <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-[18px] ${isSaved ? 'text-accent-orange' : 'text-white'}`}></i>
                {isSaved && (
                  <div className="absolute inset-0 rounded-full bg-accent-orange animate-ping opacity-40"></div>
                )}
              </div>
            </button>
            <span className={`text-xs mt-1 ${isSaved ? 'text-accent-orange' : 'text-white'}`}>{saveCount}</span>
          </div>

          {/* Collaborate + CTA section */}
          <div className="flex items-center gap-3">
            {story.allow_contributions ? (
              <button
                title="Contribute verse"
                onClick={handleOpenContribute}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 relative group"
                style={{ 
                  background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', 
                  border: '3px solid #ff6b35', 
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                  animation: 'pulse 2s infinite'
                }}
              >
                <i className="fas fa-users text-white text-2xl font-bold relative z-10"></i>
              </button>
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-700/40 text-gray-400 cursor-not-allowed relative group border-4 border-gray-400/20 shadow-xl"
                title="Contributions are disabled for this story."
              >
                <span className="absolute inset-0 rounded-full bg-white/5"></span>
                <i className="fas fa-plus text-2xl relative z-10"></i>
                <span className="absolute bottom-[-2.2rem] left-1/2 -translate-x-1/2 bg-black/90 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Contributions are disabled for this story.
                </span>
              </div>
            )}

            {/* Verse CTA button - Show if verse has URL */}
            {currentVerse?.url && isValidUrl(currentVerse.url) && (
              <button
                title={currentVerse.cta_text || 'Open link'}
                onClick={() => window.open(currentVerse.url, '_blank', 'noopener,noreferrer')}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 relative"
                style={{ 
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)', 
                  border: '2px solid #00d4ff', 
                  boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)'
                }}
              >
                <i className="fas fa-link text-white text-lg"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerseFooter;