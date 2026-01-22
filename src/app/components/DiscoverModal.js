"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { absoluteUrl } from '../../../lib/api';
import { searchApi, userApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

const DiscoverModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [followingSet, setFollowingSet] = useState(new Set());
  const [pending, setPending] = useState(new Set());
  const modalRef = useRef(null);
  const router = useRouter();
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();

  // Fetch recommended users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRecommendedUsers();
    }
  }, [isOpen]);

  // Handle escape key and overlayclick
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
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Fetch recommended users from API
  const fetchRecommendedUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.getRecommendedCreators();

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        list = data.results;
      } else {
        list = [];
      }

      // Ensure each user has boolean isFollowing and numeric followers_count
      const normalized = (list || []).map(u => ({ ...u, isFollowing: false, followers_count: u.followers_count || 0 }));
      setUsers(normalized);

      // If authenticated, load my following and mark users
      if (isAuthenticated) {
        loadMyFollowing(normalized);
      }
    } catch (error) {
      setError('Failed to load users. Please try again later.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load the current user's following list and mark recommended users accordingly
  const loadMyFollowing = useCallback(async (currentList = null) => {
    try {
      const res = await userApi.getFollowing();
      let list = [];
      if (!res) list = [];
      else if (Array.isArray(res)) list = res;
      else if (res.results && Array.isArray(res.results)) list = res.results;
      else list = Array.isArray(res.items) ? res.items : [];

      const usernames = new Set(list.map(u => (u.username || u.user || u)));
      setFollowingSet(usernames);

      // If we were passed a freshly fetched recommended list, update it
      if (Array.isArray(currentList)) {
        setUsers(currentList.map(u => ({ ...u, isFollowing: usernames.has(u.username) })));
      } else {
        setUsers(prev => prev.map(u => ({ ...u, isFollowing: usernames.has(u.username) })));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Navigate to user profile
  const navigateToProfile = (username) => {
    try {
      router.push(`/${username}`);
      onClose();
    } catch (e) {
    }
  };

  // Toggle follow/unfollow a user from the Discover modal
  const handleToggleFollow = async (e, user) => {
    try { e.stopPropagation(); } catch (err) {}
    if (!isAuthenticated) {
      try { window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'follow', data: null } })); } catch (err) {}
      openAuthModal?.();
      return;
    }

    const username = user.username;
    if (!username) return;

    // optimistic update
    setPending(prev => new Set(prev).add(username));
    setUsers(prev => prev.map(u => {
      if ((u.username || u.user) === username) {
        const nowFollowing = !Boolean(u.isFollowing);
        return { ...u, isFollowing: nowFollowing, followers_count: nowFollowing ? (Number(u.followers_count || 0) + 1) : Math.max(0, Number(u.followers_count || 0) - 1) };
      }
      return u;
    }));

    try {
      const res = await userApi.followUser(username);
      // reconcile
      const serverFollowing = res && (res.following ?? res.is_following ?? res.followed);
      if (typeof serverFollowing !== 'undefined') {
        setUsers(prev => prev.map(u => ((u.username || u.user) === username ? { ...u, isFollowing: Boolean(serverFollowing) } : u)));
      } else {
        // reload my following to be safe
        await loadMyFollowing();
      }
      // Update follower count for this user: try to use response or fetch profile
      const followerCountFromResp = res?.followers_count ?? res?.follower_count ?? (typeof res?.followers === 'number' ? res.followers : null);
      if (typeof followerCountFromResp === 'number') {
        setUsers(prev => prev.map(u => ((u.username || u.user) === username ? { ...u, followers_count: followerCountFromResp } : u)));
      } else {
        try {
          const profile = await userApi.getProfile(username);
          const newCount = profile?.followers_count ?? profile?.follower_count ?? (Array.isArray(profile?.followers) ? profile.followers.length : undefined);
          if (typeof newCount === 'number') {
            setUsers(prev => prev.map(u => ((u.username || u.user) === username ? { ...u, followers_count: newCount } : u)));
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      // rollback on error
      setUsers(prev => prev.map(u => ((u.username || u.user) === username ? { ...u, isFollowing: !u.isFollowing } : u)));
    } finally {
      setPending(prev => {
        const copy = new Set(prev);
        copy.delete(username);
        return copy;
      });
    }
  };

  if (typeof window === 'undefined') return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-lg"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div ref={modalRef} className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-hidden transform scale-100 transition-all duration-500 relative flex flex-col z-[10000]">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
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
              {users.map((user) => (
                <div 
                  key={user.id || user.username}
                  className="group relative rounded-xl p-6 border border-gray-700/30 hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 flex flex-col items-center text-center cursor-pointer bg-gradient-to-br from-slate-800/40 to-slate-900/40"
                  onClick={() => navigateToProfile(user.username)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-t-xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-2xl text-white ring-2 ring-gray-800 group-hover:ring-cyan-400 transition-all duration-300 shadow-lg overflow-hidden relative">
                      {user.profile_image_url ? (
                        <Image
                          src={absoluteUrl(user.profile_image_url)}
                          alt={user.username}
                          fill
                          className="object-cover"
                          quality={75}
                        />
                      ) : (
                        <span>{user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-gray-900 shadow-lg"></div>
                  </div>

                  <div className="w-full mb-4">
                    <div className="text-white font-bold text-lg mb-1 truncate">
                      {user.account_type === 'brand' && user.brand_name 
                        ? user.brand_name 
                        : user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.first_name || user.last_name || user.username}
                    </div>
                    <div className="text-slate-400 text-sm mb-3">@{user.username}</div>
                    {user.bio && (
                      <p className="text-slate-300 text-sm mb-4 line-clamp-2">{user.bio}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 w-full mb-5 pb-5 border-b border-gray-800/20">
                    <div className="flex justify-around">
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg">{user.followers_count || 0}</div>
                        <div className="text-slate-400 text-xs uppercase tracking-wide">Followers</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg">{user.stories_count || 0}</div>
                        <div className="text-slate-400 text-xs uppercase tracking-wide">Stories</div>
                      </div>
                    </div>

                    {/* Follow button */}
                    <div className="w-full flex justify-center">
                      <button
                        onClick={(e) => handleToggleFollow(e, user)}
                        disabled={Boolean(pending.has(user.username))}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${user.isFollowing ? 'bg-cyan-500 text-slate-900 hover:opacity-95' : 'bg-transparent border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'}`}
                      >
                        <i className={`fas ${user.isFollowing ? 'fa-check' : 'fa-user-plus'} text-sm`} />
                        {user.isFollowing ? 'Following' : (pending.has(user.username) ? '...' : 'Follow')}
                      </button>
                    </div>
                  </div>
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

        {/* Footer */}
        <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-4" style={{ position: 'sticky', bottom: 0 }}>
          <div className="flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50">Close</button>
          </div>
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71,85,105,0.4); border-radius: 10px; transition: background 0.3s ease; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71,85,105,0.7); }

          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        `}</style>
      </div>
    </div>
  );
};

export default DiscoverModal;