// components/header/Header.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
// import { useAuth } from '../../../../contexts/AuthContext';
import { useAuth } from '../../../contexts/AuthContext';
import Logo from './header/Logo';
import SearchBar from './header/SearchBar';
import NotificationBell from './header/NotificationBell';
import UserMenu from './header/UserMenu';

// 🔥 OPTIMIZED: Defer TrendingTagsModal until user opens it
const TrendingTagsModal = dynamic(() => import('./storycard/TrendingTagsModal'), { ssr: false, loading: () => null });

const Header = ({ openAuthModal }) => {
  const { isAuthenticated } = useAuth();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTrendingTags, setShowTrendingTags] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const mobileSearchBarRef = useRef(null);

  // Handle click outside to close mobile search and scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close mobile search bar when clicking outside
      if (showMobileSearch && mobileSearchBarRef.current && !mobileSearchBarRef.current.contains(event.target)) {
        setShowMobileSearch(false);
      }
    };

    // Handle scroll event to close mobile search
    const handleScroll = () => {
      if (showMobileSearch) {
        setShowMobileSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showMobileSearch]);

  // Handle tag selection from trending tags modal
  const handleTagSelect = (tagName) => {
    setShowTrendingTags(false);
    // Dispatch event to notify FeedClient to change tag filter
    window.dispatchEvent(new CustomEvent('trending:tag_selected', { detail: { tagName } }));
  };

  return (
    <div className="fixed-header hidden">
      <Logo />
      
      <div className="flex gap-1.5 sm:gap-2.5 items-center ml-auto relative">
        {/* Trending Tags Button */}
        <button 
          className="trending-tags-btn w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.8)] transition-all hover:scale-110 hover:shadow-[0_0_25px_rgba(251,191,36,1)]"
          onClick={() => {
            if (showTrendingTags) {
              setShowTrendingTags(false);
            } else {
              setShowTrendingTags(true);
              setShowMobileSearch(false);
              setShowNotifications(false);
              setShowUserMenu(false);
            }
          }}
          title="Trending Tags"
        >
          <i className="fas fa-fire text-white text-xl"></i>
        </button>

        {/* Search bar for desktop */}
        <div className="hidden md:block">
          <SearchBar />
        </div>
        
        {/* Search icon for mobile */}
        <button 
          className="search-toggle w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105 md:hidden"
          onClick={() => {
            setShowMobileSearch(!showMobileSearch);
            // Close other panels when opening search
            if (!showMobileSearch) {
              setShowUserMenu(false);
            }
          }}
        >
          <i className="fas fa-search text-white text-xl"></i>
        </button>
        
        <NotificationBell 
          isOpen={showNotifications}
          onOpen={() => {
            setShowNotifications(true);
            setShowMobileSearch(false);
            setShowUserMenu(false);
          }}
          onClose={() => setShowNotifications(false)}
        />
        
        {/* User menu or login button */}
        <UserMenu 
          openAuthModal={openAuthModal}
          isOpen={showUserMenu}
          onOpen={() => {
            setShowUserMenu(true);
            setShowMobileSearch(false);
          }}
          onClose={() => setShowUserMenu(false)}
        />
      </div>
      
      {/* Search bar for mobile - appears when toggled */}
      {showMobileSearch && (
        <div className="search-bar-mobile absolute top-16 left-4 right-4 z-50 animate-fadeIn" ref={mobileSearchBarRef}>
          <SearchBar 
            isMobile={true}
            shouldFocus={true}
            onClose={() => setShowMobileSearch(false)} 
          />
        </div>
      )}

      {/* Trending Tags Modal */}
      <TrendingTagsModal 
        isOpen={showTrendingTags}
        onClose={() => setShowTrendingTags(false)}
        onTagSelect={handleTagSelect}
      />
    </div>
  );
};

export default Header;