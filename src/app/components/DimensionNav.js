// DimensionNav.js
'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';

const DimensionNav = ({ openAuthModal, openStoryFormModal, openDiscoverModal, inStoryCard = false }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [activeDimension, setActiveDimension] = useState('explore');
  const router = useRouter();

  const handleCreatePost = () => {
    
    if (!isAuthenticated || !currentUser) {
      // If user is not authenticated, open auth modal
      if (typeof openAuthModal === 'function') {
        openAuthModal('create', {});
      } else {
      }
      return;
    }
    
    // Open the story form modal if authenticated
    if (typeof openStoryFormModal === 'function') {
      openStoryFormModal();
    } else {
    }
  };

  const handleDiscover = () => {
    
    if (!isAuthenticated || !currentUser) {
      // If user is not authenticated, open auth modal
      if (typeof openAuthModal === 'function') {
        openAuthModal('discover', {});
      }
      return;
    }
    
    // Open discover modal if authenticated
    if (typeof openDiscoverModal === 'function') {
      openDiscoverModal();
    } else {
      // fallback to discover page navigation
      router.push('/discover');
    }
  };

  const handleProfile = () => {
    
    if (!isAuthenticated || !currentUser) {
      // If user is not authenticated, open auth modal
      if (typeof openAuthModal === 'function') {
        openAuthModal('profile', {});
      }
      return;
    }
    
    // Navigate to profile page if authenticated
    if (currentUser && currentUser.username) {
      router.push(`/${currentUser.username}`);
    } else {
    }
  };

  return (
    <>
      {/* Mobile Navigation */}
      <div className={`dimension-nav md:hidden ${inStoryCard ? '' : 'fixed bottom-0'} left-0 right-0 bg-dark-blue/90 backdrop-blur-xl py-1 flex justify-around items-center z-[10051] border-t border-neon-blue/30`}>
        <div 
          className={`nav-item flex flex-col items-center text-sm transition-all cursor-pointer ${activeDimension === 'explore' ? 'active text-neon-blue' : 'text-white/80'}`} 
          data-dimension="explore"
          onClick={() => {
            setActiveDimension('explore');
            try {
              router.push('/');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tag:switch', { detail: { tag: 'for-you', force: true } }));
              }
            } catch (e) {
            }
          }}
        >
          <i className="fas fa-home text-lg mb-1"></i>
          <span className="font-semibold text-xs">Home</span>
        </div>
        
        <Link 
          href="/verses"
          className={`nav-item flex flex-col items-center text-sm transition-all cursor-pointer ${activeDimension === 'verses_page' ? 'active text-neon-blue' : 'text-white/80'}`} 
          data-dimension="verses_page"
          onClick={() => setActiveDimension('verses_page')}
        >
          <i className="fas fa-book-open text-lg mb-1"></i>
          <span className="font-semibold text-xs">Verses</span>
        </Link>
        
        <div 
          id="createPostMobileBtn" 
          className="nav-item flex flex-col items-center text-sm transition-all cursor-pointer text-white/80" 
          data-action="open-post-modal"
          onClick={handleCreatePost}
          style={{ position: 'relative', zIndex: '100001', pointerEvents: 'auto' }}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center mb-1" style={{ pointerEvents: 'auto' }}>
            <i className="fas fa-plus text-lg text-white"></i>
          </div>
        </div>
        
        <div 
          className="nav-item flex flex-col items-center text-sm transition-all cursor-pointer text-white/80" 
          data-dimension="discover_page"
          onClick={handleDiscover}
        >
          <i className="fas fa-compass text-lg mb-1"></i>
          <span className="font-semibold text-xs">Discover</span>
        </div>
        
        {isAuthenticated && currentUser ? (
          <Link 
            href={`/${currentUser.username}`}
            className={`nav-item flex flex-col items-center text-sm transition-all cursor-pointer ${activeDimension === 'profile' ? 'active text-neon-blue' : 'text-white/80'}`} 
            data-dimension="profile"
            id="mobileProfileNavBtn"
            onClick={() => setActiveDimension('profile')}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center relative overflow-hidden">
              {currentUser.profile_image_url ? (
                <Image 
                  src={currentUser.profile_image_url} 
                  alt={`${currentUser.username}'s profile`} 
                  fill
                  className="object-cover rounded-full"
                  quality={75}
                />
              ) : (
                <span className="text-white font-bold text-lg">{currentUser.username?.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </Link>
        ) : (
          <div 
            className="nav-item flex flex-col items-center text-sm transition-all cursor-pointer text-white/80" 
            data-dimension="profile"
            id="mobileProfileNavBtn"
            onClick={handleProfile}
          >
            <i className="fas fa-user-astronaut text-lg mb-1"></i>
            <span className="font-semibold text-xs">Profile</span>
          </div>
        )}
      </div>
    </>
  );
};

export default DimensionNav;