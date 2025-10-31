"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createPortal } from 'react-dom';

const DiscoverModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch recommended users when modal opens
  useEffect(() => {
    if (isOpen) {
      console.debug('[DiscoverModal] opened');
      fetchRecommendedUsers();
    }
  }, [isOpen]);

  // Handle escape key and overlay click
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Fetch recommended users from API
  const fetchRecommendedUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/recommended/');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch recommended users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching recommended users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle follow status for a user
  const toggleFollowUser = async (username, userIndex) => {
    try {
      // Update UI optimistically
      const updatedUsers = [...users];
      updatedUsers[userIndex] = {
        ...updatedUsers[userIndex],
        is_following: !updatedUsers[userIndex].is_following
      };
      setUsers(updatedUsers);

      // Make API call
      const response = await fetch(`/api/follow/${username}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || ''
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        // Revert UI change if API call fails
        const revertedUsers = [...users];
        revertedUsers[userIndex] = {
          ...revertedUsers[userIndex],
          is_following: !revertedUsers[userIndex].is_following
        };
        setUsers(revertedUsers);
        throw new Error('Failed to toggle follow status');
      }

      const data = await response.json();
      // Update with server response if needed
      if (data && typeof data.is_following !== 'undefined') {
        const finalUsers = [...users];
        finalUsers[userIndex] = {
          ...finalUsers[userIndex],
          is_following: data.is_following
        };
        setUsers(finalUsers);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };

    // Navigate to user profile
    const navigateToProfile = (username) => {
      try {
        router.push(`/user/${username}/`);
      } catch (e) {
        console.warn('navigateToProfile failed', e);
      }
    };

    // Helper function to get CSRF token
    const getCookie = (name) => {
      if (typeof document === 'undefined') return '';
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return '';
    };

  // Render modal into a portal attached to document.body to avoid stacking context issues
  if (typeof document === 'undefined') return null;

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="discover-modal-overlay fixed inset-0 z-9998 bg-black/60 backdrop-blur-sm opacity-100 visible transition-all duration-300 pointer-events-auto"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="discover-modal fixed inset-0 z-9999 flex items-center justify-center p-4 opacity-100 visible transition-all duration-300 pointer-events-auto">
        <div className="discover-container relative bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-slate-700/50 transform scale-100 transition-all duration-300">
          
          {/* Premium Header */}
          <div className="discover-header sticky top-0 z-10 flex items-center justify-between p-8 border-b border-slate-700/50 bg-linear-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <i className="fas fa-compass text-white text-xl"></i>
              </div>
              <div>
                <h2 className="discover-title text-3xl font-bold text-white">Discover Creators</h2>
                <p className="text-slate-400 text-sm mt-1">Find amazing users to follow</p>
              </div>
            </div>
            <button 
              className="discover-close w-10 h-10 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 flex items-center justify-center" 
              onClick={onClose}
              aria-label="Close"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
          
          {/* Content */}
          <div className="discover-content overflow-y-auto max-h-[calc(85vh-130px)]">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-4xl text-slate-500 mb-4"></i>
                  <p className="text-slate-400">Loading creators...</p>
                </div>
              </div>
            ) : users.length > 0 ? (
              <div className="user-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8">
                {users.map((user, index) => (
                  <div 
                    key={user.username}
                    className="user-card group relative bg-linear-to-br from-slate-800/40 to-slate-900/40 hover:from-slate-800/60 hover:to-slate-800/40 rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/80 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 flex flex-col items-center text-center cursor-pointer"
                    onClick={() => navigateToProfile(user.username)}
                  >
                    {/* Top accent line on hover */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-red-500 rounded-t-xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    
                    {/* Avatar with status */}
                    <div className="user-avatar relative mb-5">
                      {user.profile_image_url ? (
                        <Image 
                          src={user.profile_image_url} 
                          alt={user.username} 
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-700/50 group-hover:ring-orange-500/50 transition-all duration-300 shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center font-bold text-2xl text-white ring-2 ring-slate-700/50 group-hover:ring-orange-500/50 transition-all duration-300 shadow-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-lg"></div>
                    </div>
                    
                    {/* User Info */}
                    <div className="user-info w-full mb-4">
                      <div className="user-name text-white font-bold text-lg mb-1 truncate">{user.display_name || user.username}</div>
                      <div className="user-username text-slate-400 text-sm mb-3">@{user.username}</div>
                      
                      {user.bio && (
                        <p className="text-slate-300 text-sm mb-4 line-clamp-2">{user.bio}</p>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="user-stats flex justify-around gap-2 w-full mb-5 pb-5 border-b border-slate-700/30">
                      <div className="stat flex-1">
                        <div className="value text-white font-bold text-lg">{user.follower_count || 0}</div>
                        <div className="label text-slate-400 text-xs uppercase tracking-wide">Followers</div>
                      </div>
                      <div className="stat flex-1">
                        <div className="value text-white font-bold text-lg">{user.story_count || 0}</div>
                        <div className="label text-slate-400 text-xs uppercase tracking-wide">Posts</div>
                      </div>
                    </div>
                    
                    {/* Follow Button */}
                    <button 
                      className={`follow-btn w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                        user.is_following 
                          ? 'bg-slate-700/50 text-slate-200 hover:bg-slate-700 border border-slate-600' 
                          : 'bg-linear-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105 border-0'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollowUser(user.username, index);
                      }}
                    >
                      {user.is_following ? (
                        <>
                          <i className="fas fa-check mr-2"></i>Following
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus mr-2"></i>Follow
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <i className="fas fa-compass text-6xl text-slate-700/30 mb-4"></i>
                <p className="text-slate-400 text-lg">No users to discover right now</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Scrollbar Styling */
        .discover-content::-webkit-scrollbar {
          width: 8px;
        }
        
        .discover-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .discover-content::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.4);
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        
        .discover-content::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.7);
        }
        
        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Smooth transitions */
        .user-card {
          will-change: transform, box-shadow, border-color;
        }
        
        /* Animation on card hover */
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>
    </>, document.body
  );
  
  };

  export default DiscoverModal;