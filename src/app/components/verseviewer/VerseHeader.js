// components/verseviewer/VerseHeader.jsx
import React from 'react';

const VerseHeader = ({ 
  story, 
  currentVerseIndex, 
  onClose, 
  focusMode,
  hasMoments,
  currentMomentIndex,
  currentVerse
}) => {
  if (focusMode) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-400/20 p-4 transition-opacity duration-500 shadow-lg shadow-cyan-900/10">
      <div className="flex justify-between items-center">
        <div className="text-white font-medium flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 bg-clip-text text-transparent truncate block max-w-[60vw] font-bold tracking-wide drop-shadow-lg" title={`${story.title} - Verse ${currentVerseIndex + 1} of ${story.verses.length}`}>
            {story.title} <span className="opacity-60 font-normal">- Verse {currentVerseIndex + 1} of {story.verses.length}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4 mr-2">
          <div className="flex flex-col gap-0.5">
            {currentVerseIndex > 0 && (
              <div className="text-cyan-400 text-lg opacity-70 animate-pulse">↑</div>
            )}
            {currentVerseIndex < story.verses.length - 1 && (
              <div className="text-cyan-400 text-lg opacity-70 animate-pulse">↓</div>
            )}
          </div>
          
          {hasMoments && (
            <div className="flex gap-2">
              {currentMomentIndex > 0 && (
                <div className="text-purple-400 text-lg opacity-70 animate-pulse">←</div>
              )}
              {currentMomentIndex < currentVerse.moments.length - 1 && (
                <div className="text-purple-400 text-lg opacity-70 animate-pulse">→</div>
              )}
            </div>
          )}
        </div>
        
        <button 
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-all border border-cyan-400/20 shadow"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default VerseHeader;