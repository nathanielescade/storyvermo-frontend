// components/verseviewer/MomentsCarousel.jsx
import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { getMomentImageUrl } from './utils';

const MomentsCarousel = ({ 
  moments, 
  currentMomentIndex, 
  setCurrentMomentIndex,
  toggleFocusMode,
  focusMode
}) => {
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const touchStartYRef = useRef(0);
  
  const hasMultipleMoments = moments && moments.length > 1;
  
  const handleMomentTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndRef.current = e.touches[0].clientX;
  };

  const handleMomentTouchMove = (e) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    touchEndRef.current = touch.clientX;
    
    const deltaX = Math.abs(touch.clientX - touchStartRef.current);
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
    
    if (deltaX > deltaY * 1.5 && deltaX > 5) {
      e.preventDefault();
    }
  };

  const handleMomentTouchEnd = (e) => {
    const start = touchStartRef.current;
    const end = touchEndRef.current;
    
    if (!start || !end || start === end) return;
    
    const deltaX = start - end;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY * 1.5) {
      if (deltaX > 0) {
        goToNextMoment();
      } else {
        goToPreviousMoment();
      }
    }
  };

  const goToPreviousMoment = () => {
    if (currentMomentIndex <= 0) return;
    setCurrentMomentIndex(prev => prev - 1);
  };

  const goToNextMoment = () => {
    if (!moments || currentMomentIndex >= moments.length - 1) return;
    setCurrentMomentIndex(prev => prev + 1);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/10 cursor-pointer relative" onClick={toggleFocusMode}>
      {!focusMode && hasMultipleMoments && currentMomentIndex > 0 && (
        <button 
          className="absolute left-4 z-10 bg-black/50 backdrop-blur-lg rounded-full p-3 animate-pulse hover:bg-black/70 transition-all"
          style={{ top: '28%' }}
          onClick={(e) => {
            e.stopPropagation();
            goToPreviousMoment();
          }}
        >
          <i className="fas fa-chevron-left text-white"></i>
        </button>
      )}
      
      {!focusMode && hasMultipleMoments && currentMomentIndex < moments.length - 1 && (
        <button 
          className="absolute right-4 z-10 bg-black/50 backdrop-blur-lg rounded-full p-3 animate-pulse hover:bg-black/70 transition-all"
          style={{ top: '28%' }}
          onClick={(e) => {
            e.stopPropagation();
            goToNextMoment();
          }}
        >
          <i className="fas fa-chevron-right text-white"></i>
        </button>
      )}
      
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleMomentTouchStart}
        onTouchMove={handleMomentTouchMove}
        onTouchEnd={handleMomentTouchEnd}
      >
        {moments.map((moment, momentIndex) => {
          const imageUrl = getMomentImageUrl(moment);
          const momentKey = moment && (moment.id || `moment-${momentIndex}`);
          return (
            <div 
              key={momentKey} 
              className={`absolute inset-0 transition-opacity duration-300 ${momentIndex === currentMomentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {imageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={imageUrl}
                    alt={`Verse moment ${momentIndex + 1}`}
                    width={1080}
                    height={1440}
                    className="max-w-full max-h-full object-contain mx-auto my-auto"
                    quality={75}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ) : moment && moment.content ? (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="text-white text-3xl text-center font-light max-w-3xl">
                    {moment.content}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="text-gray-300 text-sm text-center">No moment available</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {!focusMode && (
        <div className="absolute bottom-32 left-0 right-0 flex justify-center space-x-2 z-60">
          {moments.map((_, momentIndex) => (
            <div 
              key={`indicator-${momentIndex}`}
              className={`w-2 h-2 rounded-full transition-all duration-300 shadow-lg ${momentIndex === currentMomentIndex ? 'bg-white w-8' : 'bg-white/30'}`}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MomentsCarousel;