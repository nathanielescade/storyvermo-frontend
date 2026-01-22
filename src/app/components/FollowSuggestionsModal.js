"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { searchApi, userApi, absoluteUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

const FollowSuggestionsModal = ({ isOpen, onClose, categories = [] }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followState, setFollowState] = useState({}); // username -> isFollowing

  const { isAuthenticated, refreshAuth } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const fetchSuggestions = async (useQuery = true) => {
      setLoading(true);
      try {
        const query = (categories && categories.length && useQuery) ? categories.join(',') : '';
        const resp = query ? await searchApi.getRecommendedCreators(query) : await searchApi.getRecommendedCreators();
        if (!active) return;
        let list = [];
        if (Array.isArray(resp)) list = resp;
        else if (resp && Array.isArray(resp.results)) list = resp.results;
        else list = [];

        if (list.length === 0 && useQuery && query) {
          // Fallback: try without query (same as DiscoverModal)
          return await fetchSuggestions(false);
        }

        setSuggestions(list.slice(0, 10));
        const initial = {};
        list.slice(0, 10).forEach(u => { initial[u.username] = !!u.is_following; });
        setFollowState(initial);
      } catch (e) {
        setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const tryFetchWhenAuth = async () => {
      // If not authenticated yet, try to refresh auth (this covers the immediate post-signup auto-login timing)
      if (!isAuthenticated) {
        try {
          await refreshAuth();
        } catch (e) {
        }
      }

      // Only fetch if now authenticated
      if (isAuthenticated) {
        await fetchSuggestions();
      } else {
        // Try one more time after a short delay — covers timing races where cookies/cache still settling
        await new Promise(r => setTimeout(r, 300));
        if (!active) return;
        try {
          if (!isAuthenticated) {
            await refreshAuth();
          }
        } catch (e) {}
        if (isAuthenticated) {
          await fetchSuggestions();
        } else {
          // As a last resort, attempt fetch anyway (backend may return public recommendations)
          await fetchSuggestions();
        }
      }
    };

    tryFetchWhenAuth();

    return () => { active = false; };
  }, [isOpen, categories, isAuthenticated, refreshAuth]);

  const toggleFollow = async (username) => {
    // Optimistic toggle
    setFollowState(prev => ({ ...prev, [username]: !prev[username] }));
    try {
      const res = await userApi.followUser(username);
      if (res && typeof res.is_following !== 'undefined') {
        setFollowState(prev => ({ ...prev, [username]: !!res.is_following }));
      }
    } catch (err) {
      // revert on failure
      setFollowState(prev => ({ ...prev, [username]: !prev[username] }));
    }
  };

  const router = useRouter();

  const navigateToProfile = (username) => {
    try {
      router.push(`/${username}`);
      // Keep modal open/close behavior to parent; here we close to match DiscoverModal behavior
      onClose();
    } catch (e) {
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[600] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-neon-blue/30 rounded-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-transparent">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Follow creators you like</h3>
            <button onClick={onClose} className="text-gray-300 hover:text-white">
              Close
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">We recommend creators based on your selected categories. Follow some to personalize your feed. (Up to 10)</p>
        </div>

        <div className="p-4">
          {loading && <div className="text-gray-400">Loading suggestions…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="text-gray-400">No suggestions available right now.</div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className="flex gap-4 overflow-x-auto py-4">
              {suggestions.map(user => (
                  <div key={user.username} className="min-w-[180px] bg-gradient-to-b from-gray-800 to-black/40 border border-blue-900/30 rounded-xl p-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div onClick={() => navigateToProfile(user.username)} className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center cursor-pointer relative">
                        {user.profile_image_url ? (
                          // Use Image component for optimization
                          <Image
                            src={absoluteUrl(user.profile_image_url) || user.profile_image_url}
                            alt={user.display_name || user.username}
                            fill
                            className="rounded-full object-cover"
                            quality={75}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white">
                            {String(user.username || '').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div onClick={() => navigateToProfile(user.username)} className="text-white font-semibold cursor-pointer">{user.display_name || user.username}</div>
                        <div className="text-xs text-gray-400">@{user.username}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        className={`px-3 py-2 rounded-full text-sm font-medium ${followState[user.username] ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
                        onClick={() => toggleFollow(user.username)}
                      >
                        {followState[user.username] ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-800/60 text-white">Skip</button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowSuggestionsModal;
