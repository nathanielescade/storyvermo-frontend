"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { userApi, storiesApi, absoluteUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import StoryCard from '../components/StoryCard';
import ShareModal from '../components/ShareModal';

// SmartImg component remains unchanged
function SmartImg({ src, alt = '', width, height, fill, className, style, onClick }) {
  if (!src) return null;
  const isObjectUrl = typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));

  if (isObjectUrl) {
    const imgStyle = { ...(style || {}) };
    if (fill) {
      imgStyle.width = '100%';
      imgStyle.height = '100%';
      if (!imgStyle.objectFit) imgStyle.objectFit = 'cover';
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={className}
          style={imgStyle}
          onClick={onClick}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onClick={onClick}
      />
    );
  }

  // Use Next.js Image for remote URLs to get optimization benefits
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        style={{ ...style, objectFit: 'cover' }}
        onClick={onClick}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
}

export default function ProfileClient({ username, initialProfile = null }) {
  // Use server-provided initialProfile when available to render instantly
  const [user, setUser] = useState(initialProfile ? { ...initialProfile } : null);
  const [stories, setStories] = useState([]);
  const [verses, setVerses] = useState([]);
  const [savedStories, setSavedStories] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  // If we have an initial profile, don't show the loading screen
  const [loading, setLoading] = useState(initialProfile ? false : true);
  const [imageModal, setImageModal] = useState({ visible: false, type: null, url: '' });
  // Follow-related state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [myFollowingSet, setMyFollowingSet] = useState(new Set());
  const [pendingModalFollows, setPendingModalFollows] = useState(new Set());
  const [followModal, setFollowModal] = useState({ visible: false, tab: 'followers' });
  
  // New state for story feed modal
  const [storyFeedModal, setStoryFeedModal] = useState({ visible: false, initialIndex: 0 });
  const feedContainerRef = useRef(null);
  
  // Share modal state
  const [shareModal, setShareModal] = useState({ visible: false, shareData: null });
  
  // Refs for file inputs
  const profileFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);

  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const router = useRouter();

  // Load followers/following data for this profile (counts + lists)
  const loadFollowData = useCallback(async () => {
    try {
      // Fetch followers and following for the profile user in parallel.
      // Also fetch current user's following to determine isFollowing status.
      const [followersRes, followingRes, myFollowingRes] = await Promise.allSettled([
        userApi.getFollowers(username),
        userApi.getFollowing(username),
        isAuthenticated ? userApi.getFollowing() : Promise.resolve(null)
      ]);

      const normalize = (res) => {
        if (!res) return { list: [], count: 0 };
        if (Array.isArray(res)) return { list: res, count: res.length };
        if (res.results && Array.isArray(res.results)) return { list: res.results, count: res.count || res.results.length };
        if (typeof res.count === 'number' && Array.isArray(res.items)) return { list: res.items, count: res.count };
        return { list: Array.isArray(res) ? res : [], count: res.count || 0 };
      };

      const f = normalize(followersRes.status === 'fulfilled' ? followersRes.value : null);
      const g = normalize(followingRes.status === 'fulfilled' ? followingRes.value : null);

      // Normalize list items to objects so downstream UI can access fields like
      // `brand_name`, `first_name`, `last_name`, and `profile_image_url`.
      const normalizeUserItem = (item) => {
        if (!item) return null;
        // plain username string
        if (typeof item === 'string') return { username: item };
        // wrappers like { user: 'username' } or { user: { username, ... } }
        if (item.user) {
          if (typeof item.user === 'string') return { username: item.user };
          if (typeof item.user === 'object') return item.user;
        }
        // some APIs return { username } directly or richer objects
        if (typeof item === 'object') return item;
        return null;
      };

      const normalizedFollowers = f.list.map(normalizeUserItem).filter(Boolean);
      const normalizedFollowing = g.list.map(normalizeUserItem).filter(Boolean);

      setFollowersList(normalizedFollowers);
      setFollowersCount(f.count);
      setFollowingList(normalizedFollowing);
      setFollowingCount(g.count);

      // Determine whether current user follows this profile
      if (isAuthenticated && myFollowingRes.status === 'fulfilled' && Array.isArray(myFollowingRes.value)) {
        const myFollowing = myFollowingRes.value;
        const myFollowingUsernames = myFollowing.map(u => (u && (u.username || u.user || u)));
        const found = myFollowingUsernames.some(un => un === username);
        // store current user's following set for modal follow buttons
        try {
          const setUsernames = new Set(myFollowingUsernames.filter(Boolean));
          setMyFollowingSet(setUsernames);
        } catch (e) {}
        setIsFollowing(Boolean(found));
      } else if (currentUser?.username) {
        // As a fallback, check normalized followers list for current user presence
        const found = normalizedFollowers.some(u => (u && (u.username || u.user || u)) === currentUser.username);
        setIsFollowing(Boolean(found));
      }
    } catch (error) {
      // ignore silently; non-critical
    }
  }, [username, isAuthenticated, currentUser?.username]);

  // Helper to safely get the first character of a username (defensive)
  const getInitial = (name, fallback = '') => {
    if (!name) return fallback;
    try {
      const s = String(name);
      return s.length > 0 ? s.charAt(0).toUpperCase() : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const getDisplayName = (user) => {
    if (!user) return 'Unknown';
    
    // Check if account is brand type and has brand_name
    if (user.account_type === 'brand' && user.brand_name) {
      return user.brand_name;
    }
  
    // Prefer explicit full-name fields, then assemble from first/last, then fallback to username
    const first = user.first_name || user.creator_first_name || user.given_name || '';
    const last = user.last_name || user.creator_last_name || user.family_name || '';
    const explicitFull = user.get_full_name || user.full_name || user.name || user.display_name || '';
    const combined = `${first} ${last}`.trim();
    
    return (explicitFull && explicitFull.trim()) || (combined && combined) || user.username || 'Unknown';
  };

  // In the fetchProfile function in ProfileClient.js
  const fetchProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile(username);
      
      // Build a robust full-name value from multiple possible API fields
      const first = response.first_name || response.creator_first_name || response.given_name || '';
      const last = response.last_name || response.creator_last_name || response.family_name || '';
      const explicitFull = response.get_full_name || response.full_name || response.name || response.display_name || '';
      const combined = `${first} ${last}`.trim();
      const fullName = (explicitFull && explicitFull.trim()) || (combined && combined) || response.username || '';

      const userData = {
        ...response,
        get_full_name: fullName,
      };
      
      setUser(userData);

      // Handle stories data - it should now be included in the response
      setStories(response.stories || []);
      setVerses(response.verses || []);
      setSavedStories(response.saved_stories || []);
      
    } catch (error) {
    } finally {
      // Only clear loading if we didn't already have an initial profile
      if (!initialProfile) setLoading(false);
    }
  }, [username, currentUser?.username, initialProfile]);

  useEffect(() => {
    // If we have an initialProfile passed from the server, we still run
    // a background fetch to refresh data, but avoid toggling the loading
    // UI so the page appears instant to the user.
    if (username) fetchProfile();
  }, [username, fetchProfile]);

  // Load follow counts/lists when username changes
  useEffect(() => {
    if (username) {
      try {
        loadFollowData();
      } catch (e) {
        // ignore
      }
    }
  }, [username, loadFollowData]);

  // When feed modal opens, scroll the feed to the requested initial index
  useEffect(() => {
    if (storyFeedModal.visible && feedContainerRef.current) {
      // small delay to ensure children are rendered
      const t = setTimeout(() => {
        try {
          const idx = Number(storyFeedModal.initialIndex) || 0;
          const children = feedContainerRef.current.querySelectorAll(':scope > *');
          if (children && children.length > idx) {
            const el = children[idx];
            el?.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        } catch (e) {
          // ignore
        }
      }, 60);

      return () => clearTimeout(t);
    }
  }, [storyFeedModal.visible, storyFeedModal.initialIndex]);

  const handleImageUpload = useCallback(async (file, type) => {
    try {
      // Create object URL for immediate preview BEFORE uploading
      const objectUrl = URL.createObjectURL(file);
      
      // Update the user state immediately with the object URL for instant preview
      setUser(prev => ({
        ...prev,
        [type === 'profile' ? 'profile_image_url' : 'cover_image_url']: objectUrl
      }));
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);
      
      // Upload the image
      const uploadResponse = await userApi.updateProfileImage(username, formData);
      
      // Add a cache-busting query param so browsers and CDNs will fetch the
      // newest image instead of serving a cached copy
      const appendCacheBuster = (u) => {
        try {
          if (!u || typeof u !== 'string') return u;
          const ts = Date.now();
          return u.includes('?') ? `${u}&v=${ts}` : `${u}?v=${ts}`;
        } catch (e) {
          return u;
        }
      };

      // Use the response from the upload if available, otherwise fetch fresh data
      let updatedProfile = uploadResponse || {};
      if (!uploadResponse || !uploadResponse.profile_image_url) {
        // After successful upload, fetch the updated profile to get the real URL from server
        updatedProfile = await userApi.getProfile(username);
      }
      
      // Recompute full name for the updated profile
      const uFirst = updatedProfile.first_name || updatedProfile.creator_first_name || updatedProfile.given_name || '';
      const uLast = updatedProfile.last_name || updatedProfile.creator_last_name || updatedProfile.family_name || '';
      const uExplicit = updatedProfile.get_full_name || updatedProfile.full_name || updatedProfile.name || updatedProfile.display_name || '';
      const uCombined = `${uFirst} ${uLast}`.trim();
      const uFullName = (uExplicit && uExplicit.trim()) || (uCombined && uCombined) || updatedProfile.username || '';

      // Inject cache-busted URLs into the updated profile
      if (updatedProfile.profile_image_url) {
        updatedProfile.profile_image_url = appendCacheBuster(updatedProfile.profile_image_url);
      }
      if (updatedProfile.cover_image_url) {
        updatedProfile.cover_image_url = appendCacheBuster(updatedProfile.cover_image_url);
      }

      // Update state with the real server URLs (replacing the blob URL)
      setUser(prev => ({
        ...prev,
        ...updatedProfile,
        get_full_name: uFullName
      }));

      // Clean up the temporary blob URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      // Revert the blob URL on error
      setUser(prev => ({
        ...prev,
        [type === 'profile' ? 'profile_image_url' : 'cover_image_url']: type === 'profile' ? user.profile_image_url : user.cover_image_url
      }));
    }
  }, [username, user]);

  // Handle story card click
  const handleStoryClick = (e, index) => {
    e.preventDefault();
    setStoryFeedModal({ visible: true, initialIndex: index });
  };

  // Handle story interactions
  const handleLikeToggle = async (slug) => {
    try {
      await storiesApi.toggleLike(slug);
      // Update stories state
      setStories(prev => prev.map(story => 
        story.slug === slug 
          ? { 
              ...story, 
              isLiked: !story.isLiked,
              likes_count: story.isLiked ? story.likes_count - 1 : story.likes_count + 1
            }
          : story
      ));
    } catch (error) {
    }
  };

  const handleSaveToggle = async (slug) => {
    try {
      await storiesApi.toggleSave(slug);
      setStories(prev => prev.map(story => 
        story.slug === slug 
          ? { ...story, isSaved: !story.isSaved }
          : story
      ));
    } catch (error) {
    }
  };

  const handleDeleteStory = (slug) => {
    setStories(prev => prev.filter(story => story.slug !== slug));
  };

  // Handle tag clicks from StoryCard/TagsSection: navigate to tag feed
  const handleTagSelect = (tagName) => {
    if (!tagName) return;

    if (tagName === 'following' && !isAuthenticated) {
      try { window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'following', data: null } })); } catch (e) {}
      openAuthModal?.();
      return;
    }

    try {
      const slug = encodeURIComponent(String(tagName).toLowerCase().replace(/\s+/g,'-'));
      const newUrl = tagName === 'for-you' ? '/' : `/tags/${slug}/`;
      try { router.push(newUrl); } catch (e) { window.history.pushState({}, '', newUrl); }
    } catch (e) {
      // ignore
    }

    try {
      window.dispatchEvent(new CustomEvent('tag:switch', { detail: { tag: tagName } }));
    } catch (e) {
      // ignore
    }
  };

  // Toggle follow/unfollow for this profile
  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      try { window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'follow', data: null } })); } catch (e) {}
      openAuthModal?.();
      return;
    }

    // Optimistic UI update
    const optimistic = !isFollowing;
    setIsFollowing(optimistic);
    setFollowersCount(prev => optimistic ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await userApi.followUser(username);

      // reconcile with server response when possible
      const serverFollowing = res && (res.following ?? res.is_following ?? res.followed);
      if (typeof serverFollowing !== 'undefined') {
        setIsFollowing(Boolean(serverFollowing));
      }

      // if server returns fresh counts, use them
      if (res && typeof res.followers_count === 'number') {
        setFollowersCount(res.followers_count);
      } else {
        // reload lists to be safe
        await loadFollowData();
      }
    } catch (error) {
      // rollback optimistic update on error
      setIsFollowing(prev => !prev);
      setFollowersCount(prev => optimistic ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  // Toggle follow/unfollow for an arbitrary user from the followers/following modal
  const handleToggleUserFollow = async (e, targetUsername) => {
    try { e.stopPropagation(); } catch (err) {}
    if (!isAuthenticated) {
      try { window.dispatchEvent(new CustomEvent('auth:open', { detail: { type: 'follow', data: null } })); } catch (e) {}
      openAuthModal?.();
      return;
    }

    if (!targetUsername) return;

    // optimistic update: add to pending, toggle myFollowingSet and update lists' follower counts
    setPendingModalFollows(prev => new Set(prev).add(targetUsername));

    // Determine current relation and compute optimistic new state
    const wasFollowing = myFollowingSet.has(targetUsername);
    const nowFollowing = !wasFollowing;

    // Update myFollowingSet optimistically
    setMyFollowingSet(prev => {
      const copy = new Set(prev);
      if (nowFollowing) copy.add(targetUsername); else copy.delete(targetUsername);
      return copy;
    });

    // Update follower counts in the lists based on optimistic nowFollowing
    setFollowersList(prev => prev.map(u => {
      const uname = (u && (u.username || u.user || u)) || String(u || '');
      if (uname === targetUsername) {
        const newCount = nowFollowing ? (Number(u.followers_count || 0) + 1) : Math.max(0, Number(u.followers_count || 0) - 1);
        return { ...u, followers_count: newCount };
      }
      return u;
    }));

    setFollowingList(prev => prev.map(u => {
      const uname = (u && (u.username || u.user || u)) || String(u || '');
      if (uname === targetUsername) {
        const newCount = nowFollowing ? (Number(u.followers_count || 0) + 1) : Math.max(0, Number(u.followers_count || 0) - 1);
        return { ...u, followers_count: newCount };
      }
      return u;
    }));

    try {
      const res = await userApi.followUser(targetUsername);
      const serverFollowing = res && (res.following ?? res.is_following ?? res.followed);

      if (typeof serverFollowing !== 'undefined') {
        setMyFollowingSet(prev => {
          const copy = new Set(prev);
          if (serverFollowing) copy.add(targetUsername); else copy.delete(targetUsername);
          return copy;
        });
      } else {
        // reload full following list to be safe
        try {
          const meFollowing = await userApi.getFollowing();
          let list = [];
          if (!meFollowing) list = [];
          else if (Array.isArray(meFollowing)) list = meFollowing;
          else if (meFollowing.results && Array.isArray(meFollowing.results)) list = meFollowing.results;
          else list = Array.isArray(meFollowing.items) ? meFollowing.items : [];
          const setUsernames = new Set(list.map(u => (u.username || u.user || u)));
          setMyFollowingSet(setUsernames);
        } catch (e) {
          // ignore
        }
      }

      // update follower count if provided or fetch target profile
      const followerCountFromResp = res?.followers_count ?? res?.follower_count ?? (typeof res?.followers === 'number' ? res.followers : null);
      if (typeof followerCountFromResp === 'number') {
        setFollowersList(prev => prev.map(u => {
          const uname = (u && (u.username || u.user || u)) || String(u || '');
          return uname === targetUsername ? { ...u, followers_count: followerCountFromResp } : u;
        }));
        setFollowingList(prev => prev.map(u => {
          const uname = (u && (u.username || u.user || u)) || String(u || '');
          return uname === targetUsername ? { ...u, followers_count: followerCountFromResp } : u;
        }));
      } else {
        try {
          const profile = await userApi.getProfile(targetUsername);
          const newCount = profile?.followers_count ?? profile?.follower_count ?? (Array.isArray(profile?.followers) ? profile.followers.length : undefined);
          if (typeof newCount === 'number') {
            setFollowersList(prev => prev.map(u => {
              const uname = (u && (u.username || u.user || u)) || String(u || '');
              return uname === targetUsername ? { ...u, followers_count: newCount } : u;
            }));
            setFollowingList(prev => prev.map(u => {
              const uname = (u && (u.username || u.user || u)) || String(u || '');
              return uname === targetUsername ? { ...u, followers_count: newCount } : u;
            }));
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      // rollback optimistic changes using the inverse of nowFollowing
      setMyFollowingSet(prev => {
        const copy = new Set(prev);
        if (nowFollowing) copy.delete(targetUsername); else copy.add(targetUsername);
        return copy;
      });
      // optionally reload lists
      try { await loadFollowData(); } catch (e) {}
    } finally {
      setPendingModalFollows(prev => {
        const copy = new Set(prev);
        copy.delete(targetUsername);
        return copy;
      });
    }
  };

  // Handle profile share
  const handleShareProfile = () => {
    const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/@${username}`;
    const displayName = user ? (user.brand_name || `${user.first_name} ${user.last_name}`) : username;
    
    setShareModal({
      visible: true,
      shareData: {
        title: `${displayName} on StoryVermo`,
        description: user?.bio || `Check out ${displayName}'s profile on StoryVermo`,
        url: profileUrl
      }
    });
  };

  // Helper function to get a valid image URL or null
  const getImageUrl = (imageObj) => {
    if (!imageObj) return null;
    
    // Handle different possible structures of image object
    let imageUrl;
    if (typeof imageObj === 'string') {
      imageUrl = imageObj;
    } else {
      imageUrl = imageObj.file_url || imageObj.url;
    }
    
    // Check if imageUrl is a string and not empty
    if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      return imageUrl;
    }
    
    return null;
  };

  // Trigger file input clicks
  const triggerProfileImageUpload = () => {
    profileFileInputRef.current?.click();
  };

  const triggerCoverImageUpload = () => {
    coverFileInputRef.current?.click();
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950">
        <div className="text-gray-400">User not found</div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-950 to-slate-950">
      {/* Cover Photo Section */}
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden group cursor-pointer" onClick={() => user.cover_image_url && setImageModal({ visible: true, url: user.cover_image_url, type: 'cover' })}>
        {user.cover_image_url ? (
          <SmartImg
            src={absoluteUrl(user.cover_image_url) || ''}
            alt="Cover"
            fill
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900/30 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-image text-slate-600 text-6xl opacity-30 mb-4"></i>
              <p className="text-slate-500 text-sm">No cover photo</p>
            </div>
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
        
        {/* Cover Photo Upload Button (Only for own profile) */}
        {currentUser && currentUser.username === username && (
          <button 
            onClick={(e) => { e.stopPropagation(); triggerCoverImageUpload(); }}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-xl shadow-lg shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center z-20 hover:scale-110"
          >
            <i className="fas fa-plus"></i>
          </button>
        )}
        <input 
          ref={coverFileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden"
          onChange={(e) => {
            if (e.target.files[0]) {
              handleImageUpload(e.target.files[0], 'cover');
            }
          }}
        />
      </div>

      {/* Profile Header */}
      <div className="relative -mt-24 px-4 md:px-8 z-10">
        <div className="max-w-6xl mx-auto">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Profile Picture with Name, Username, and Follow Button */}
            <div className="flex gap-4 mb-6 items-end">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0 group">
                <div className="w-28 h-28 rounded-full border-4 border-cyan-400/50 shadow-2xl shadow-cyan-500/30 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-5xl font-bold cursor-pointer hover:border-cyan-300 transition-all" onClick={() => setImageModal({ visible: true, url: user.profile_image_url, type: 'profile' })}>
                  {user.profile_image_url ? (
                    <SmartImg
                      src={absoluteUrl(user.profile_image_url) || ''}
                      alt={user.username}
                      fill
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <span className="text-cyan-400">{getInitial(user?.username, '')}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-slate-950 shadow-lg"></div>
                
                {/* Profile Picture Upload Button (Only for own profile) */}
                {currentUser && currentUser.username === username && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); triggerProfileImageUpload(); }}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center hover:scale-110 z-10"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}
                <input 
                  ref={profileFileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleImageUpload(e.target.files[0], 'profile');
                    }
                  }}
                />
              </div>

              {/* Name, Username, and Follow Button */}
              <div className="flex-1 flex flex-col gap-2 ml-2 pb-1">
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">
                    {getDisplayName(user)}
                  </h1>
                  <p className="text-cyan-400 font-semibold text-sm mt-1">@{user.username}</p>
                </div>

                {/* Mobile Follow/Edit/Share Button */}
                <div className="flex gap-1 items-center">
                  {currentUser && currentUser.username === username ? (
                    <>
                      <button onClick={() => router.push('/settings/profile')} className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-1 shadow-lg shadow-cyan-500/30 text-sm w-fit">
                        <i className="fas fa-edit"></i>
                        Edit
                      </button>
                      <button 
                        onClick={handleShareProfile}
                        className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-1 shadow-lg shadow-cyan-500/30 text-sm w-fit"
                      >
                        <i className="fas fa-share-alt"></i>
                        Share
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleToggleFollow}
                        className={`px-3 py-2 font-semibold rounded-lg transition-all duration-300 flex items-center gap-1 shadow-lg text-sm w-fit ${isFollowing ? 'bg-blue-500/90 hover:bg-blue-600 text-white shadow-blue-500/30' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-cyan-500/30'}`}
                      >
                        <i className={`fas ${isFollowing ? 'fa-check' : 'fa-plus'}`}></i>
                        <span className="follow-btn-text">{isFollowing ? 'Following' : 'Follow'}</span>
                      </button>
                      <button 
                        onClick={handleShareProfile}
                        className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-1 shadow-lg shadow-cyan-500/30 text-sm w-fit"
                      >
                        <i className="fas fa-share-alt"></i>
                        Share
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio and Details for Mobile */}
            {user.bio && (
              <p className="text-slate-300 mb-4 text-sm line-clamp-2">{user.bio}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
              {user.location && (
                <div className="flex items-center gap-2">
                  <i className="fas fa-map-marker-alt text-cyan-400"></i>
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-2">
                  <i className="fas fa-link text-cyan-400"></i>
                  <a href={user.website} target="_blank" className="hover:text-cyan-400 transition">{user.website.length > 30 ? user.website.substring(0, 30) + '...' : user.website}</a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <i className="fas fa-calendar-alt text-cyan-400"></i>
                <span>Joined {new Date(user.date_joined || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex md:flex-col md:gap-8">
            {/* Profile Picture and Name Row */}
            <div className="flex gap-8 items-end">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0 group">
                <div className="w-56 h-56 rounded-full border-4 border-cyan-400/50 shadow-2xl shadow-cyan-500/30 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-8xl font-bold cursor-pointer hover:border-cyan-300 transition-all" onClick={() => setImageModal({ visible: true, url: user.profile_image_url, type: 'profile' })}>
                  {user.profile_image_url ? (
                    <SmartImg
                      src={absoluteUrl(user.profile_image_url) || ''}
                      alt={user.username}
                      fill
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <span className="text-cyan-400">{getInitial(user?.username, '')}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-slate-950 shadow-lg"></div>
                
                {/* Profile Picture Upload Button (Only for own profile) */}
                {currentUser && currentUser.username === username && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); triggerProfileImageUpload(); }}
                    className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-lg shadow-lg shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center hover:scale-110 z-10"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}
                <input 
                  ref={profileFileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleImageUpload(e.target.files[0], 'profile');
                    }
                  }}
                />
              </div>

              {/* Name, Username, and Follow Button */}
              <div className="flex-1 flex flex-col gap-2 pb-1">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {getDisplayName(user)}
                  </h1>
                  <p className="text-cyan-400 font-semibold text-lg mt-1">@{user.username}</p>
                </div>

                {/* Desktop Follow/Edit/Share Button */}
                <div className="flex gap-2 items-center">
                  {currentUser && currentUser.username === username ? (
                    <>
                      <button onClick={() => router.push('/settings/profile')} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg shadow-cyan-500/30 w-fit">
                        <i className="fas fa-edit"></i>
                        Edit Profile
                      </button>
                      <button 
                        onClick={handleShareProfile}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg shadow-cyan-500/30 w-fit"
                      >
                        <i className="fas fa-share-alt"></i>
                        Share Profile
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleToggleFollow}
                        className={`px-4 py-2 font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg w-fit ${isFollowing ? 'bg-blue-500/90 hover:bg-blue-600 text-white shadow-blue-500/30' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-cyan-500/30'}`}
                      >
                        <i className={`fas ${isFollowing ? 'fa-check' : 'fa-plus'}`}></i>
                        <span className="follow-btn-text">{isFollowing ? 'Following' : 'Follow'}</span>
                      </button>
                      <button 
                        onClick={handleShareProfile}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg shadow-cyan-500/30 w-fit"
                      >
                        <i className="fas fa-share-alt"></i>
                        Share Profile
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio and Details Section */}
            <div>
              {user.bio && (
                <p className="text-slate-300 mb-4 max-w-2xl line-clamp-2">{user.bio}</p>
              )}

              {/* Location & Details */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                {user.location && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-cyan-400"></i>
                    <span>{user.location}</span>
                  </div>
                )}
                {user.website && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-link text-cyan-400"></i>
                    <a href={user.website} target="_blank" className="hover:text-cyan-400 transition">{user.website.length > 30 ? user.website.substring(0, 30) + '...' : user.website}</a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <i className="fas fa-calendar-alt text-cyan-400"></i>
                  <span>Joined {new Date(user.date_joined || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section - Followers/Following Only (KEPT FROM ORIGINAL) */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 my-5 flex gap-4 flex-wrap md:flex-nowrap">
        {/* Followers Card */}
        <button
          onClick={() => setFollowModal({ visible: true, tab: 'followers' })}
          className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-1 flex items-center gap-2 cursor-pointer hover:border-cyan-400/50 transition"
        >
          <p className="text-xl font-bold text-blue-400">{followersCount}</p>
          <p className="text-slate-400 text-xs">Followers</p>
        </button>

        {/* Following Card */}
        <button
          onClick={() => setFollowModal({ visible: true, tab: 'following' })}
          className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-1 flex items-center gap-2 cursor-pointer hover:border-cyan-400/50 transition"
        >
          <p className="text-xl font-bold text-blue-400">{followingCount}</p>
          <p className="text-slate-400 text-xs">Following</p>
        </button>
      </div>

      {/* Container for Tabs and Content */}
      <div className="container mx-auto px-4 relative">
        {/* Content Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex gap-8 justify-between md:justify-start">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`pb-2 px-2 flex flex-col items-center gap-1 ${activeTab === 'posts' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-th text-lg"></i>
              <span className="text-xs">Stories ({stories.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('verses')}
              className={`pb-2 px-2 flex flex-col items-center gap-1 ${activeTab === 'verses' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-align-left text-lg"></i>
              <span className="text-xs">Verses ({verses.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('contributions')}
              className={`pb-2 px-2 flex flex-col items-center gap-1 ${activeTab === 'contributions' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-handshake text-lg"></i>
              <span className="text-xs">Contrib ({(() => { const contributedVerses = verses.filter(verse => { const storyCreatorId = verse.story_creator_id || (verse.story_data?.creator_id); const currentUserId = user?.id || user?.public_id; if (!storyCreatorId || !currentUserId) return false; return String(storyCreatorId) !== String(currentUserId); }); return contributedVerses.length; })()})</span>
            </button>
            {/* Only show Saved tab if viewing current user's profile */}
            {currentUser?.username === username && (
              <button 
                onClick={() => setActiveTab('saved')}
                className={`pb-2 px-2 flex flex-col items-center gap-1 ${activeTab === 'saved' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
              >
                <i className="fas fa-bookmark text-lg"></i>
                <span className="text-xs">Saved ({savedStories.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="mb-12 pb-12">
          {activeTab === 'posts' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stories.map((story, i) => {
                const coverImageUrl = getImageUrl(story.cover_image);
                return (
                  <div 
                    key={story.slug || i}
                    onClick={(e) => handleStoryClick(e, i)}
                    className="cursor-pointer group"
                  >
                    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/60 to-indigo-900/60 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                      {coverImageUrl ? (
                        <SmartImg
                          src={absoluteUrl(coverImageUrl)}
                          alt={story.title}
                          width={400}
                          height={160}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                          <i className="fas fa-image text-4xl text-white/20"></i>
                        </div>
                      )}
                      <div className="p-3">
                        <h3
                          className="text-sm font-semibold mb-1 text-white group-hover:text-cyan-300 transition-colors"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            maxHeight: '3rem'
                          }}
                        >
                          {story.title}
                        </h3>
                        <div className="flex gap-3 text-sm text-gray-400 mb-1">
                          <span><i className="fas fa-heart mr-1 text-cyan-500"></i>{story.likes_count || 0}</span>
                          <span><i className="fas fa-comment mr-1 text-purple-500"></i>{story.comments_count || 0}</span>
                          <span><i className="fas fa-share mr-1 text-blue-500"></i>{story.shares_count || 0}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <span>Verses: {story.verses_count || story.verses?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Verses Tab */}
          {activeTab === 'verses' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {verses.length > 0 ? (
                verses.map((verse, i) => {
                  // Mirror logic from src/app/verses/page.js to display the same card
                  const id = verse.id || verse.public_id || verse.slug || '';
                  const storyObj = verse.story || {};
                  const storySlug = (typeof storyObj === 'string' ? storyObj : (storyObj.slug || storyObj.story_slug)) || verse.story_slug || '';
                  const storyTitle = (typeof storyObj === 'object' && storyObj) ? (storyObj.title || storyObj.story_title) : (verse.story_title || 'Story');
                  const excerpt = verse.content ? String(verse.content).slice(0, 120) : '';

                  const getFirstMomentImage = (v) => {
                    if (!v) return null;
                    const moments = v.moments || v.images || [];
                    const first = Array.isArray(moments) && moments.length > 0 ? moments[0] : null;
                    if (!first) return null;
                    if (typeof first === 'string') return absoluteUrl(first);
                    if (first.file_url) return absoluteUrl(first.file_url);
                    if (first.url) return absoluteUrl(first.url);
                    if (first.image) {
                      if (typeof first.image === 'string') return absoluteUrl(first.image);
                      if (first.image.file_url) return absoluteUrl(first.image.file_url);
                      if (first.image.url) return absoluteUrl(first.image.url);
                    }
                    return null;
                  };

                  const thumb = getFirstMomentImage(verse);
                  const momentsCount = Array.isArray(verse.moments) ? verse.moments.length : (Array.isArray(verse.images) ? verse.images.length : 0);
                  const likes = verse.likes_count || verse.like_count || verse.likes || 0;
                  const saves = verse.saves_count || verse.save_count || verse.saves || 0;
                  const rawTitle = (verse.title && String(verse.title).trim()) || (excerpt ? `${excerpt}...` : 'Untitled Verse');
                  const displayTitle = rawTitle.length > 80 ? `${rawTitle.slice(0,80).trim()}...` : rawTitle;
                  const displayStoryTitle = (storyTitle && String(storyTitle).trim()) || 'Story';
                  const href = storySlug ? `/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(id)}` : '#';

                  return (
                    <Link
                      key={verse.public_id || verse.slug || i}
                      href={href}
                      className="block bg-slate-900/50 rounded-2xl overflow-hidden transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                    >
                      <div className="relative w-full h-48 bg-gray-800">
                        {thumb ? (
                          <SmartImg src={thumb} alt={verse.title || 'Verse image'} className="w-full h-full object-cover" fill />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white/20">
                            <i className="fas fa-book-open text-4xl"></i>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute left-3 top-3 bg-black/50 backdrop-blur-sm text-xs text-white px-2 py-1 rounded-xl">
                          {momentsCount} {momentsCount === 1 ? 'moment' : 'moments'}
                        </div>

                        <div className="absolute left-3 bottom-3 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
                            {(() => {
                              const author = verse.author;
                              let displayName = verse.author_name || '';
                              if (author) {
                                displayName = author.account_type === 'brand' && author.brand_name 
                                  ? author.brand_name 
                                  : author.username || author.author_name || '';
                              }
                              if (!displayName) return 'U';
                              return displayName.split(' ').map(s => s[0]?.toUpperCase()).slice(0,2).join('');
                            })()}
                          </div>
                          <div className="text-xs text-white/90">
                            {(() => {
                              const author = verse.author;
                              if (author && author.account_type === 'brand' && author.brand_name) {
                                return author.brand_name;
                              }
                              return author?.username || verse.author_name || 'Unknown';
                            })()}
                          </div>
                        </div>

                        <div className="absolute right-3 bottom-3 flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg text-xs text-rose-300">
                            <i className="fas fa-heart"></i>
                            <span className="ml-1 text-white text-sm">{likes}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg text-xs text-yellow-300">
                            <i className="fas fa-bookmark"></i>
                            <span className="ml-1 text-white text-sm">{saves}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div
                          className="text-sm font-semibold mb-1 leading-tight text-white"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            maxHeight: '3rem'
                          }}
                        >
                          {displayTitle}
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 text-cyan-500/50">
                    <i className="fas fa-book-open"></i>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">No verses yet</h3>
                  <p className="text-gray-400">Start contributing to stories!</p>
                </div>
              )}
            </div>
          )}

          {/* Contributions Tab - Show verses this user has contributed to (verses by this user in other people's stories) */}
          {activeTab === 'contributions' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(() => {
                // Filter verses to show only contributions (verses where author is current user but story creator is not)
                const contributedVerses = verses.filter(verse => {
                  // Get story creator ID from the backend field (story_creator_id or story_data.creator_id)
                  const storyCreatorId = verse.story_creator_id || (verse.story_data?.creator_id);
                  
                  // Get current user ID
                  const currentUserId = user?.id || user?.public_id;
                  
                  // Keep only if story creator is different from the profile user
                  // (meaning this verse was contributed to someone else's story)
                  if (!storyCreatorId || !currentUserId) return false;
                  
                  return String(storyCreatorId) !== String(currentUserId);
                });

                return contributedVerses.length > 0 ? (
                  contributedVerses.map((verse, i) => {
                    const id = verse.id || verse.public_id || verse.slug || '';
                    const storyObj = verse.story || {};
                    const storySlug = (typeof storyObj === 'string' ? storyObj : (storyObj.slug || storyObj.story_slug)) || verse.story_slug || '';
                    const storyTitle = (typeof storyObj === 'object' && storyObj) ? (storyObj.title || storyObj.story_title) : (verse.story_title || 'Story');
                    const excerpt = verse.content ? String(verse.content).slice(0, 120) : '';

                    const getFirstMomentImage = (v) => {
                      if (!v) return null;
                      const moments = v.moments || v.images || [];
                      const first = Array.isArray(moments) && moments.length > 0 ? moments[0] : null;
                      if (!first) return null;
                      if (typeof first === 'string') return absoluteUrl(first);
                      if (first.file_url) return absoluteUrl(first.file_url);
                      if (first.url) return absoluteUrl(first.url);
                      if (first.image) {
                        if (typeof first.image === 'string') return absoluteUrl(first.image);
                        if (first.image.file_url) return absoluteUrl(first.image.file_url);
                        if (first.image.url) return absoluteUrl(first.image.url);
                      }
                      return null;
                    };

                    const thumb = getFirstMomentImage(verse);
                    const momentsCount = Array.isArray(verse.moments) ? verse.moments.length : (Array.isArray(verse.images) ? verse.images.length : 0);
                    const likes = verse.likes_count || verse.like_count || verse.likes || 0;
                    const saves = verse.saves_count || verse.save_count || verse.saves || 0;
                    const rawTitle = (verse.title && String(verse.title).trim()) || (excerpt ? `${excerpt}...` : 'Untitled Verse');
                    const displayTitle = rawTitle.length > 80 ? `${rawTitle.slice(0,80).trim()}...` : rawTitle;
                    const displayStoryTitle = (storyTitle && String(storyTitle).trim()) || 'Story';
                    const href = storySlug ? `/stories/${encodeURIComponent(storySlug)}/?verse=${encodeURIComponent(id)}` : '#';

                    return (
                      <Link
                        key={verse.public_id || verse.slug || i}
                        href={href}
                        className="block bg-slate-900/50 rounded-2xl overflow-hidden transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                      >
                        <div className="relative w-full h-48 bg-gray-800">
                          {thumb ? (
                            <SmartImg src={thumb} alt={verse.title || 'Verse image'} className="w-full h-full object-cover" fill />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white/20">
                              <i className="fas fa-book-open text-4xl"></i>
                            </div>
                          )}
                          {momentsCount > 1 && (
                            <div className="absolute top-2 right-2 bg-cyan-500/80 px-2 py-1 rounded-lg text-xs text-white font-semibold">
                              {momentsCount} images
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 flex gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg text-xs text-orange-300">
                              <i className="fas fa-heart"></i>
                              <span className="ml-1 text-white text-sm">{likes}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg text-xs text-yellow-300">
                              <i className="fas fa-bookmark"></i>
                              <span className="ml-1 text-white text-sm">{saves}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                          <div
                            className="text-sm font-semibold mb-1 leading-tight text-white"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              maxHeight: '3rem'
                            }}
                          >
                              {displayTitle}
                            </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4 text-cyan-500/50">
                      <i className="fas fa-handshake"></i>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No contributions yet</h3>
                    <p className="text-gray-400">Start contributing verses to stories!</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Saved Tab */}
          {activeTab === 'saved' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedStories.length > 0 ? (
                savedStories.map((story, i) => {
                  const coverImageUrl = getImageUrl(story.cover_image);
                  return (
                    <div 
                      key={story.slug || i}
                      onClick={(e) => handleStoryClick(e, i)}
                      className="cursor-pointer group"
                    >
                      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/60 to-indigo-900/60 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                        {coverImageUrl ? (
                          <SmartImg
                            src={absoluteUrl(coverImageUrl)}
                            alt={story.title}
                            width={400}
                            height={160}
                            className="w-full h-40 object-cover"
                          />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <i className="fas fa-image text-4xl text-white/20"></i>
                          </div>
                        )}
                        <div className="p-3">
                          <h3
                            className="text-sm font-semibold mb-1 text-white group-hover:text-cyan-300 transition-colors"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              maxHeight: '3rem'
                            }}
                          >
                            {story.title}
                          </h3>
                          <div className="flex gap-3 text-sm text-gray-400 mb-1">
                            <span><i className="fas fa-heart mr-1 text-cyan-500"></i>{story.likes_count || 0}</span>
                            <span><i className="fas fa-comment mr-1 text-purple-500"></i>{story.comments_count || 0}</span>
                            <span><i className="fas fa-share mr-1 text-blue-500"></i>{story.shares_count || 0}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            <span>Verses: {story.verses_count || story.verses?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 text-cyan-500/50">
                    <i className="fas fa-bookmark"></i>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">No saved stories</h3>
                  <p className="text-gray-400">Save stories to see them here!</p>
                </div>
              )}
            </div>
          )}

          {/* Empty States */}
          {activeTab === 'posts' && stories.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 text-cyan-500/50">
                <i className="fas fa-book-open"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">No stories yet</h3>
              <p className="text-gray-400">Start writing your first story!</p>
            </div>
          )}
        </div>
      </div>

      {/* Story Feed Modal - TikTok Style (use homepage feed layout but keep StoryCard styles unchanged) */}
        {storyFeedModal.visible && (
          <div className="fixed inset-0 z-[9999] bg-black">
            {/* Close button */}
            <button 
              onClick={() => setStoryFeedModal({ visible: false, initialIndex: 0 })}
              className="fixed top-20 right-4 z-[10100] w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>

            {/* Wrapper ensures we don't cover the sidebar on large screens and centers on small screens */}
            <div className="h-full overflow-y-auto">
              <div className="flex justify-center md:justify-start h-full">
                {/* Add left padding on md+ to move the feed away from the sidebar (sidebar width = 280px) */}
                <div className="w-full md:pl-[280px]">
                  {/* Reuse the homepage "image-feed" container so StoryCard renders the same size without changing StoryCard itself */}
                  <div className="image-feed" ref={feedContainerRef}>
                    {stories.map((story, index) => (
                      <StoryCard
                        key={story.slug || index}
                        story={story}
                        index={index}
                        viewType="feed"
                        onLikeToggle={handleLikeToggle}
                        onSaveToggle={handleSaveToggle}
                        onDeleteStory={handleDeleteStory}
                        onTagSelect={handleTagSelect}
                        isAuthenticated={isAuthenticated}
                        openAuthModal={openAuthModal}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Followers / Following Modal */}
        {followModal.visible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-semibold text-white">{followModal.tab === 'followers' ? 'Followers' : 'Following'}</h3>
                  <div className="text-sm text-gray-400">{followModal.tab === 'followers' ? `${followersCount} people` : `${followingCount} people`}</div>
                </div>
                <div>
                  <button
                    onClick={() => setFollowModal({ visible: false, tab: 'followers' })}
                    className="px-3 py-1 rounded-md bg-cyan-500 text-slate-900 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {(followModal.tab === 'followers' ? followersList : followingList).length > 0 ? (
                  (followModal.tab === 'followers' ? followersList : followingList).map((u, i) => {
                    const uname = (u && (u.username || u.user || u)) || String(u || '').toString();
                    const avatar = u && (u.profile_image_url || u.profile_image || u.avatar || u.image) || null;
                    const isSelfEntry = currentUser?.username && currentUser.username === uname;
                    return (
                      <div key={uname + i} className="flex items-center gap-4 p-3 hover:bg-slate-900/40 rounded-md">
                        <Link href={`/${encodeURIComponent(uname)}`} className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm overflow-hidden">
                            {avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatar} alt={uname} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold">{(uname && uname[0]?.toUpperCase()) || 'U'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const displayName = (typeof u === 'string') ? uname : getDisplayName(u);
                              return (
                                <>
                                  <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                                  <div className="text-xs text-gray-400 truncate">@{uname}</div>
                                </>
                              );
                            })()}
                          </div>
                        </Link>
                        <div>
                          {!isSelfEntry && (
                            <button
                              onClick={(e) => handleToggleUserFollow(e, uname)}
                              disabled={pendingModalFollows.has(uname)}
                              className={`px-3 py-1 rounded-md font-semibold ${myFollowingSet.has(uname) ? 'bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10' : 'bg-cyan-500 text-slate-900 hover:opacity-95'}`}
                            >
                              {pendingModalFollows.has(uname) ? '...' : (myFollowingSet.has(uname) ? 'Following' : 'Follow')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-400 py-12">No users yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        <ShareModal 
          isOpen={shareModal.visible}
          onClose={() => setShareModal({ visible: false, shareData: null })}
          shareData={shareModal.shareData}
        />

        {imageModal.visible && (
          <div className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/80">
            <div className="bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-6 flex flex-col items-center max-w-3xl w-full">
              {imageModal.url ? (
                <SmartImg
                  src={absoluteUrl(imageModal.url)}
                  alt="Full size"
                  width={800}
                  height={600}
                  className="rounded-2xl mb-4"
                />
              ) : (
                <div className="w-full h-96 bg-slate-900/60 rounded-2xl mb-4 flex items-center justify-center">
                  <i className="fas fa-image text-4xl text-gray-600"></i>
                </div>
              )}
              <div className="flex justify-end gap-4 w-full">
                <button 
                  onClick={() => setImageModal({ visible: false, type: null, url: '' })}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    <style jsx global>{`
      @keyframes bounce-in {
        0% { transform: scale(0.7); opacity: 0; }
        60% { transform: scale(1.1); opacity: 1; }
        80% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      .animate-bounce-in {
        animation: bounce-in 0.7s cubic-bezier(.68,-0.55,.27,1.55);
      }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(6, 10, 25, 0.5);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(56, 189, 248, 0.3);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(56, 189, 248, 0.5);
      }
    `}</style>
    </>
  );
}