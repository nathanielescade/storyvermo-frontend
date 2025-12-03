// components/header/Header.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
// import { useAuth } from '../../../../contexts/AuthContext';
import { useAuth } from '../../../contexts/AuthContext';
import Logo from './header/Logo';
import SearchBar from './header/SearchBar';
import NotificationBell from './header/NotificationBell';
import UserMenu from './header/UserMenu';

const Header = ({ openAuthModal }) => {
  const { isAuthenticated } = useAuth();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mobileSearchBarRef = useRef(null);

  // Mark component as mounted to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
    
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

  return (
    <div className="fixed-header ">
      <Logo />
      
      <div className="flex gap-4 items-center ml-auto relative">
        {/* Search bar for desktop */}
        <div className="hidden md:block">
          <SearchBar />
        </div>
        
        {mounted && (
          <NotificationBell />
        )}
        
        {/* Search icon for mobile */}
        <button 
          className="search-toggle w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.7)] transition-transform hover:scale-105 md:hidden"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
        >
          <i className="fas fa-search text-white text-xl"></i>
        </button>
        
        {/* User menu or login button */}
        {mounted ? (
          <UserMenu openAuthModal={openAuthModal} />
        ) : (
          // Placeholder div during server rendering to maintain layout
          <div className="w-20 h-10"></div>
        )}
      </div>
      
      {/* Search bar for mobile - appears when toggled */}
      {showMobileSearch && (
        <div className="search-bar-mobile absolute top-16 left-4 right-4 z-50 animate-fadeIn" ref={mobileSearchBarRef}>
          <SearchBar 
            isMobile={true} 
            onClose={() => setShowMobileSearch(false)} 
          />
        </div>
      )}
    </div>
  );
};

export default Header;