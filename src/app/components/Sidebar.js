'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { absoluteUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

const Sidebar = ({ user, followers, recentStories }) => {
  const [activeDimension, setActiveDimension] = useState('explore');
  const router = useRouter();

  const handleTagClick = (tag) => {
    try {
      // Navigate and broadcast a tag switch so FeedClient updates the feed (SSR-backed)
      router.push(`/?tag=${tag}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tag:switch', { detail: { tag, force: true } }));
      }
    } catch (e) {
      // ignore
    }
  };

  const { currentUser, isAuthenticated } = useAuth();

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'create' } }));
      return;
    }
    // Request GlobalShell to open story form
    window.dispatchEvent(new CustomEvent('shell:open_story_form'));
  };

  const handleDiscoverClick = () => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'discover' } }));
      return;
    }
    window.dispatchEvent(new CustomEvent('shell:open_discover'));
  };

  return (
    <div className="sidebar" id="sidebar">
      {/* Sidebar close button for mobile */}
      <button 
        id="sidebarCloseBtn" 
        className="md:hidden absolute top-4 right-4 z-50 bg-black/70 rounded-full w-10 h-10 flex items-center justify-center text-white"
        style={{ display: 'none' }}
      >
        <i className="fas fa-times text-2xl"></i>
      </button>
      
      {/* Main navigation with enhanced styling */}
      <div className="sidebar-nav">
        <div 
          className={`sidebar-nav-item group ${activeDimension === 'explore' ? 'active' : ''}`} 
          data-dimension="explore"
          onClick={() => {
            setActiveDimension('explore');
            try {
              router.push('/');
              if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tag:switch', { detail: { tag: 'for-you', force: true } }));
            } catch (e) {}
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-blue/20 group-hover:to-neon-blue/10 transition-all duration-300">
            <i className="fas fa-home text-neon-blue group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Home</span>
        </div>
        
        <div 
          className={`sidebar-nav-item group ${activeDimension === 'verses_page' ? 'active' : ''}`} 
          data-dimension="verses_page"
          onClick={() => {
            setActiveDimension('verses_page');
            try { router.push('/verses'); } catch (e) {}
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-purple/20 group-hover:to-neon-purple/10 transition-all duration-300">
            <i className="fas fa-book-open text-neon-purple group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Verses</span>
        </div>
        
        <div 
          className="sidebar-nav-item group" 
          data-action="open-post-modal"
          style={{ position: 'relative', zIndex: '100001', pointerEvents: 'auto' }}
          onClick={handleCreateClick}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-accent-orange/20 group-hover:to-accent-orange/10 transition-all duration-300">
            <i className="fas fa-plus text-accent-orange group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Create Story</span>
        </div>
        
        <div 
          className={`sidebar-nav-item group ${activeDimension === 'saved' ? 'active' : ''}`} 
          data-dimension="saved"
          onClick={() => {
            setActiveDimension('saved');
            try { router.push('/saved'); } catch (e) {}
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-pink/20 group-hover:to-neon-pink/10 transition-all duration-300">
            <i className="fas fa-bookmark text-neon-pink group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Saved</span>
        </div>
        
        {user ? (
          <div
            className={`sidebar-nav-item group ${activeDimension === 'profile' ? 'active' : ''}`}
            data-dimension="profile"
            id="profileNavBtn"
            onClick={() => {
              setActiveDimension('profile');
              try { router.push(`/${user.username}`); } catch (e) {}
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-blue/20 group-hover:to-neon-blue/10 transition-all duration-300">
              <i className="fas fa-user-astronaut text-neon-blue group-active:text-white"></i>
            </div>
            <span className="font-rajdhani font-medium">Profile</span>
          </div>
        ) : (
          <div 
            className="sidebar-nav-item group" 
            data-dimension="profile" 
            id="profileNavBtn"
            onClick={() => {
              setActiveDimension('profile');
              if (!isAuthenticated) window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'profile' } }));
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-blue/20 group-hover:to-neon-blue/10 transition-all duration-300">
              <i className="fas fa-user-astronaut text-neon-blue group-active:text-white"></i>
            </div>
            <span className="font-rajdhani font-medium">Profile</span>
          </div>
        )}
        
        <div 
          className="sidebar-nav-item group" 
          data-action="open-discover-modal"
          onClick={handleDiscoverClick}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-blue/20 group-hover:to-neon-blue/10 transition-all duration-300">
            <i className="fas fa-compass text-neon-blue group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Discover</span>
        </div>
      </div>
      
      {/* Discovery section with enhanced styling */}
      <div className="sidebar-section">
        <div className="sidebar-section-title flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.8)]"></div>
          <span className="font-orbitron text-xs uppercase tracking-wider text-neon-blue">Discovery</span>
        </div>
        
        <div className="sidebar-nav-item group" onClick={() => handleTagClick('for-you')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-purple/20 group-hover:to-neon-purple/10 transition-all duration-300">
            <i className="fas fa-star text-neon-purple group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">For You</span>
        </div>
        
        <div className="sidebar-nav-item group" onClick={() => handleTagClick('trending')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-purple/20 group-hover:to-neon-purple/10 transition-all duration-300">
            <i className="fas fa-fire text-neon-purple group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Trending</span>
        </div>
        
        <div className="sidebar-nav-item group" onClick={() => handleTagClick('recent')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-purple/20 group-hover:to-neon-purple/10 transition-all duration-300">
            <i className="fas fa-clock text-neon-purple group-active:text-white"></i>
          </div>
          <span className="font-rajdhani font-medium">Recent</span>
        </div>
        
        {user && (
          <div className="sidebar-nav-item group" onClick={() => handleTagClick('following')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-neon-purple/20 group-hover:to-neon-purple/10 transition-all duration-300">
              <i className="fas fa-user-friends text-neon-purple group-active:text-white"></i>
            </div>
            <span className="font-rajdhani font-medium">Following</span>
          </div>
        )}
      </div>
      
      {/* Followers section */}
      {user && (
        <div className="sidebar-section followers-section">
          <div className="sidebar-section-title flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.8)]"></div>
            <span className="font-orbitron text-xs uppercase tracking-wider text-neon-blue">Followers</span>
          </div>
          
          <div className="followers-list">
            {followers && followers.length > 0 ? (
              followers.map((follower, index) => (
                <div key={index} className="follower-item">
                  <div className="follower-avatar">
                    {follower.profile && follower.profile.profile_image_url ? (
                      <Image src={absoluteUrl(follower.profile.profile_image_url)} alt={follower.username} width={32} height={32} className="rounded-full object-cover" quality={75} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-orange to-neon-pink flex items-center justify-center font-bold text-sm text-white">
                        {follower.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="follower-name">{follower.username}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm px-5">No followers yet</div>
            )}
          </div>
        </div>
      )}
      
      {/* New Posts section */}
        <div className="sidebar-section new-posts-section">
        <div className="sidebar-section-title flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(0,212,255,0.8)]"></div>
          <span className="font-orbitron text-xs uppercase tracking-wider text-neon-blue">New Stories</span>
        </div>
        
        <div className="new-posts-list">
          {recentStories && recentStories.length > 0 ? (
            recentStories.map((story, index) => (
              <div key={index} className="new-post-item">
                {story.cover_image && story.cover_image.file_url ? (
                  <Image src={absoluteUrl(story.cover_image.file_url)} alt="Story" width={200} height={150} className="new-post-image object-cover" quality={75} />
                ) : (
                  <div className="new-post-image bg-gray-800 flex items-center justify-center">
                    <i className="fas fa-image text-2xl text-white/20"></i>
                  </div>
                )}
                <div className="new-post-content">
                  <div className="new-post-title">{story.title}</div>
                  <div className="new-post-author">by {story.creator}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm px-5">No new stories yet</div>
          )}
        </div>
      </div>
      
      {/* Enhanced footer with neon styling */}
      <div className="sidebar-footer relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-neon-purple/5 z-0"></div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="text-xs font-rajdhani text-white/50 text-center">© {new Date().getFullYear()} StoryVerm</div>
          <div className="flex gap-2">
            <div className="w-1 h-1 rounded-full bg-neon-blue"></div>
            <div className="w-1 h-1 rounded-full bg-neon-purple"></div>
            <div className="w-1 h-1 rounded-full bg-neon-pink"></div>
          </div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent"></div>
      </div>
    </div>
  );
};

export default Sidebar;