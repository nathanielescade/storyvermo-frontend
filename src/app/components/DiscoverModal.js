"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { searchApi, userApi } from '../../../lib/api';

const DiscoverModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
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

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Fetch recommended users from API
  const fetchRecommendedUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching recommended users...');
      const data = await searchApi.getRecommendedCreators();
      console.log('API response:', data);

      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        setUsers(data.results);
      } else {
        console.debug('[DiscoverModal] no recommended users returned', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching recommended users:', error);
      setError('Failed to load users. Please try again later.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle follow status for a user (use userApi.followUser which handles CSRF)
  const toggleFollowUser = async (username, userIndex) => {
    const prevUsers = [...users];
    try {
      // Optimistic UI update
      const updatedUsers = [...users];
      updatedUsers[userIndex] = {
        ...updatedUsers[userIndex],
        is_following: !updatedUsers[userIndex].is_following
      };
      setUsers(updatedUsers);

      // Call centralized API helper
      const data = await userApi.followUser(username);

      // If backend returned explicit status, apply it
      if (data && typeof data.is_following !== 'undefined') {
        const finalUsers = [...updatedUsers];
        finalUsers[userIndex] = {
          ...finalUsers[userIndex],
          is_following: data.is_following
        };
        setUsers(finalUsers);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      // Revert optimistic update on error
      setUsers(prevUsers);
    }
  };

  // Navigate to user profile
  const navigateToProfile = (username) => {
    try {
      router.push(`/user/${username}/`);
      onClose(); // Close modal after navigation
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

  // Don't render on server
  if (typeof window === 'undefined') return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-lg"
        onClick={onClose}
      ></div>

      {/* Modal themed like ContributeModal */}
  <div className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-hidden transform scale-100 transition-all duration-500 relative flex flex-col z-[10000]">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
              <i className="fas fa-compass text-cyan-400 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Discover Creators</h2>
              <p className="text-gray-400 text-sm mt-1">Find amazing users to follow</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
              aria-label="Close"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 overflow-y-auto flex-grow custom-scrollbar" style={{ minHeight: '0' }}>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-4xl text-slate-500 mb-4"></i>
                <p className="text-slate-400">Loading creators...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <i className="fas fa-exclamation-circle text-6xl text-red-500/30 mb-4"></i>
              <p className="text-slate-400 text-lg">{error}</p>
              <button 
                className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-colors"
                onClick={fetchRecommendedUsers}
              >
                Try Again
              </button>
            </div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
              {users.map((user, index) => (
                <div 
                  key={user.id || user.username}
                  className="group relative rounded-xl p-6 border border-gray-700/30 hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 flex flex-col items-center text-center cursor-pointer bg-gradient-to-br from-slate-800/40 to-slate-900/40"
                  onClick={() => navigateToProfile(user.username)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-t-xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                  <div className="relative mb-5">
                    {user.profile_image_url ? (
                      <Image 
                        src={user.profile_image_url} 
                        alt={user.username} 
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-800 group-hover:ring-cyan-400 transition-all duration-300 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-2xl text-white ring-2 ring-gray-800 group-hover:ring-cyan-400 transition-all duration-300 shadow-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-gray-900 shadow-lg"></div>
                  </div>

                  <div className="w-full mb-4">
                    <div className="text-white font-bold text-lg mb-1 truncate">{user.display_name || user.username}</div>
                    <div className="text-slate-400 text-sm mb-3">@{user.username}</div>
                    {user.bio && (
                      <p className="text-slate-300 text-sm mb-4 line-clamp-2">{user.bio}</p>
                    )}
                  </div>

                  <div className="flex justify-around gap-2 w-full mb-5 pb-5 border-b border-gray-800/20">
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{user.follower_count || user.followers_count || 0}</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wide">Followers</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{user.story_count || user.stories_count || 0}</div>
                      <div className="text-slate-400 text-xs uppercase tracking-wide">Posts</div>
                    </div>
                  </div>

                  <button 
                    className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all duration-300 ${
                      user.is_following 
                        ? 'bg-gray-800/60 text-slate-200 hover:bg-gray-700 border border-gray-700/50' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/30 hover:scale-105 border border-cyan-500/30'
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
            <div className="flex flex-col items-center justify-center py-16">
              <i className="fas fa-compass text-6xl text-slate-700/30 mb-4"></i>
              <p className="text-slate-400 text-lg">No users to discover right now</p>
              <button 
                className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-colors"
                onClick={fetchRecommendedUsers}
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Footer (sticky) similar to Contribute modal for actions if needed in future */}
        <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-4" style={{ position: 'sticky', bottom: 0 }}>
          <div className="flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50">Close</button>
          </div>
        </div>

        <style jsx global>{`
          /* Scrollbar Styling */
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71,85,105,0.4); border-radius: 10px; transition: background 0.3s ease; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71,85,105,0.7); }

          /* Line clamp utility */
          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        `}</style>
      </div>
    </div>
  );
};

export default DiscoverModal;