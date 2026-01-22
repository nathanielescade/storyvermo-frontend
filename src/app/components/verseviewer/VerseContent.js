// components/verseviewer/VerseContent.jsx
import React from 'react';

const VerseContent = ({ 
  content, 
  fontSize, 
  setFontSize, 
  toggleFocusMode 
}) => {
  return (
    <div className="w-full h-full flex justify-center bg-black/10 cursor-pointer relative" onClick={toggleFocusMode}>
      <div className="absolute top-20 right-3 z-20 flex flex-row gap-2 items-end">
        <button
          className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-200/50 to-blue-500/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-cyan-400/40 text-2xl font-bold"
          onClick={e => { e.stopPropagation(); setFontSize(f => Math.min(f + 4, 80)); }}
          title="Zoom In"
          tabIndex={0}
        >
          +
        </button>
        <button
          className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/50 to-blue-500/50 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-cyan-400/40 text-2xl font-bold"
          onClick={e => { e.stopPropagation(); setFontSize(f => Math.max(f - 4, 12)); }}
          title="Zoom Out"
          tabIndex={0}
        >
          −
        </button>
      </div>
      <div className="w-full max-w-3xl h-full relative">
        <div className="overflow-y-auto px-6 py-8" style={{ maxHeight: 'calc(100vh - 160px)', minHeight: '120px', marginTop: '64px', marginBottom: '80px' }}>
          <div className="text-white font-light" style={{ whiteSpace: 'pre-line', textAlign: 'left', fontSize: fontSize, transition: 'font-size 0.2s' }}>
            {content || 'No content for this verse'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerseContent;