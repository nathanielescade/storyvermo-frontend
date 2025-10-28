// DimensionNav.js
'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

const DimensionNav = ({ openAuthModal, openStoryFormModal, inStoryCard = false }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [activeDimension, setActiveDimension] = useState('explore');
  const router = useRouter();

  const handleCreatePost = () => {
    console.log('handleCreatePost called');
    console.log('Props received:', { openAuthModal, openStoryFormModal });
    console.log('Auth state:', { currentUser, isAuthenticated });
    console.log('openAuthModal type:', typeof openAuthModal);
    console.log('openStoryFormModal type:', typeof openStoryFormModal);
    
    if (!isAuthenticated || !currentUser) {
      console.log('User not authenticated, opening auth modal');
      // If user is not authenticated, open auth modal
      if (typeof openAuthModal === 'function') {
        openAuthModal('create', {});
      } else {
        console.error('openAuthModal is not a function');
      }
      return;
    }
    
    // Open the story form modal if authenticated
    if (typeof openStoryFormModal === 'function') {
      console.log('Opening story form modal');
      openStoryFormModal();
    } else {
      console.error('openStoryFormModal is not a function, value:', openStoryFormModal);
    }
  };

  const handleDiscover = () => {
    console.log('handleDiscover called');
    
    if (!isAuthenticated || !currentUser) {
      // If user is not authenticated, open auth modal
      if (typeof openAuthModal === 'function') {
        openAuthModal('discover', {});
      }
      return;
    }
    
    // Navigate to discover page if authenticated
    router.push('/discover');
  };

  const handleProfile = () => {
    console.log('handleProfile called');
    
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
      console.error('User has no username');
    }
  };

  return (
    <>
      {/* Mobile Navigation */}
      <div className={`dimension-nav md:hidden ${inStoryCard ? '' : 'fixed bottom-0'} left-0 right-0 bg-dark-blue/90 backdrop-blur-xl py-2 flex justify-around items-center z-[100] border-t border-neon-blue/30`}>
        <div 
          className={`nav-item flex flex-col items-center text-base transition-all cursor-pointer ${activeDimension === 'explore' ? 'active text-neon-blue' : 'text-white/80'}`} 
          data-dimension="explore"
          onClick={() => setActiveDimension('explore')}
        >
          <i className="fas fa-home text-2xl mb-2"></i>
          <span className="font-semibold">Home</span>
        </div>
        
        <Link 
          href="/verses"
          className={`nav-item flex flex-col items-center text-base transition-all cursor-pointer ${activeDimension === 'verses_page' ? 'active text-neon-blue' : 'text-white/80'}`} 
          data-dimension="verses_page"
          onClick={() => setActiveDimension('verses_page')}
        >
          <i className="fas fa-book-open text-2xl mb-2"></i>
          <span className="font-semibold">Verses</span>
        </Link>
        
        <div 
          id="createPostMobileBtn" 
          className="nav-item flex flex-col items-center text-base transition-all cursor-pointer text-white/80" 
          data-action="open-post-modal"
          onClick={handleCreatePost}
          style={{ position: 'relative', zIndex: '100001', pointerEvents: 'auto' }}
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center mb-2" style={{ pointerEvents: 'auto' }}>
            <i className="fas fa-plus text-2xl text-white"></i>
          </div>
        </div>
        
        <div 
          className="nav-item flex flex-col items-center text-base transition-all cursor-pointer text-white/80" 
          data-dimension="discover_page"
          onClick={handleDiscover}
        >
          <i className="fas fa-compass text-2xl mb-2"></i>
          <span className="font-semibold">Discover</span>
        </div>
        
        {isAuthenticated && currentUser ? (
          <Link 
            href={`/${currentUser.username}`}
            className={`nav-item flex flex-col items-center text-base transition-all cursor-pointer ${activeDimension === 'profile' ? 'active text-neon-blue' : 'text-white/80'}`} 
            data-dimension="profile"
            id="mobileProfileNavBtn"
            onClick={() => setActiveDimension('profile')}
          >
            <i className="fas fa-user-astronaut text-2xl mb-2"></i>
            <span className="font-semibold">Profile</span>
          </Link>
        ) : (
          <div 
            className="nav-item flex flex-col items-center text-base transition-all cursor-pointer text-white/80" 
            data-dimension="profile"
            id="mobileProfileNavBtn"
            onClick={handleProfile}
          >
            <i className="fas fa-user-astronaut text-2xl mb-2"></i>
            <span className="font-semibold">Profile</span>
          </div>
        )}
      </div>
    </>
  );
};

export default DimensionNav;