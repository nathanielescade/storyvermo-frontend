"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { userApi, storiesApi, absoluteUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import StoryCard from '../components/StoryCard';
import WeeklyWinnersBanner from '../components/WeeklyWinnersBanner';
import UserRankCard from '../components/UserRankCard';
import WeeklyProgressBar from '../components/WeeklyProgressBar';

// SmartImg: choose native <img> for blob/data URLs (object URLs / previews)
// and use next/image for regular remote URLs. This avoids next/image errors
// when previewing local uploads (object URLs) while still using next/image
// for remote/static images.
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

  // FIXED: Use regular img tag instead of Next.js Image for better compatibility
  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...style, width: '100%', height: '100%', objectFit: 'cover' }}
        onClick={onClick}
      />
    );
  }

  return (
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

export default function ProfileClient({ username, initialProfile = null }) {
  // Use server-provided initialProfile when available to render instantly
  const [user, setUser] = useState(initialProfile || null);
  const [stories, setStories] = useState([]);
  const [verses, setVerses] = useState([]);
  const [savedStories, setSavedStories] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  // If we have an initial profile, don't show the loading screen
  const [loading, setLoading] = useState(initialProfile ? false : true);
  const [badgeModal, setBadgeModal] = useState({ visible: false, badge: null });
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [followersModal, setFollowersModal] = useState({ visible: false, type: 'followers' });
  const [imageModal, setImageModal] = useState({ visible: false, type: null, url: '' });
  
  // New state for story feed modal
  const [storyFeedModal, setStoryFeedModal] = useState({ visible: false, initialIndex: 0 });
  const feedContainerRef = useRef(null);
  
  // Refs for file inputs
  const profileFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  
  // State for current user's following list
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();

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

  // Helper function to get display name based on account type
  const getDisplayName = (user) => {
    if (!user) return 'Unknown';
    // Check if account is brand type and has brand_name
    if (user.account_type === 'brand' && user.brand_name) {
      return user.brand_name;
    }
    // Fallback to full name or username
    return user.get_full_name || user.full_name || user.username || 'Unknown';
  };

  // Fetch current user's following list
  const fetchCurrentUserFollowing = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.username) return;
    
    try {
      const response = await userApi.getFollowing(currentUser.username);
      setCurrentUserFollowing(response.map(user => user.username));
    } catch (error) {
    }
  }, [isAuthenticated, currentUser?.username]);

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
      setFollowers(response.followers || []);
      setFollowing(response.following || []);
      
      // Always update isFollowing from the API response, regardless of whether it's the current user's profile
      // This ensures the follow button shows the correct state
      setIsFollowing(!!response.is_following);
    } catch (error) {

    } finally {
      // Only clear loading if we didn't already have an initial profile
      if (!initialProfile) setLoading(false);
    }
  }, [username, currentUser?.username, initialProfile]);

  // Fetch followers and following data when modal is opened
  const fetchFollowersData = useCallback(async (type) => {
    try {
      let response;
      if (type === 'followers') {
        response = await userApi.getFollowers(username);
        setFollowers(response || []);
      } else {
        response = await userApi.getFollowing(username);
        setFollowing(response || []);
      }
    } catch (error) {
    }
  }, [username]);

  useEffect(() => {
    // If we have an initialProfile passed from the server, we still run
    // a background fetch to refresh data, but avoid toggling the loading
    // UI so the page appears instant to the user.
    if (username) fetchProfile();
    if (isAuthenticated) fetchCurrentUserFollowing();
  }, [username, fetchProfile, isAuthenticated, fetchCurrentUserFollowing]);

  // When followers modal is opened, fetch the data
  useEffect(() => {
    if (followersModal.visible) {
      fetchFollowersData(followersModal.type);
    }
  }, [followersModal.visible, followersModal.type, fetchFollowersData]);

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

  const handleFollow = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      const response = await userApi.followUser(username);
      setIsFollowing(response.is_following);
      // Update follower list and user follower count
      setFollowers(prev => response.is_following
        ? [...prev, currentUser]
        : prev.filter(f => f.username !== currentUser.username)
      );
      setUser(prev => ({ ...prev, followers_count: typeof response.follower_count !== 'undefined' ? response.follower_count : (prev.followers_count || 0) + (response.is_following ? 1 : -1) }));
      // Broadcast event so other components can update
      try { window.dispatchEvent(new CustomEvent('user:follow:update', { detail: { username, is_following: response.is_following, follower_count: response.follower_count } })); } catch (e) {}
      // Update current user's following list
      if (response.is_following) {
        setCurrentUserFollowing(prev => [...prev, username]);
      } else {
        setCurrentUserFollowing(prev => prev.filter(u => u !== username));
      }
    } catch (error) {
    }
  };

  // Handle following/unfollowing a user in the modal
  const handleFollowUser = async (userToFollow) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      const response = await userApi.followUser(userToFollow.username);
      
      // Update the current user's following list
      if (response.is_following) {
        setCurrentUserFollowing(prev => [...prev, userToFollow.username]);
      } else {
        setCurrentUserFollowing(prev => prev.filter(u => u !== userToFollow.username));
      }
      // If the modal lists include this user, update their follower_count and is_following
      setFollowers(prev => prev.map(f => f.username === userToFollow.username ? ({ ...f, is_following: response.is_following, followers_count: typeof response.follower_count !== 'undefined' ? response.follower_count : f.followers_count }) : f));
      setFollowing(prev => prev.map(f => f.username === userToFollow.username ? ({ ...f, is_following: response.is_following, followers_count: typeof response.follower_count !== 'undefined' ? response.follower_count : f.followers_count }) : f));
      // If the user we followed/unfollowed is the profile being viewed, update count too
      if (userToFollow.username === username) {
        setUser(prev => ({ ...prev, followers_count: typeof response.follower_count !== 'undefined' ? response.follower_count : prev.followers_count }));
        setIsFollowing(response.is_following);
      }
      // Broadcast event
      try { window.dispatchEvent(new CustomEvent('user:follow:update', { detail: { username: userToFollow.username, is_following: response.is_following, follower_count: response.follower_count } })); } catch (e) {}
    } catch (error) {
    }
  };

  // Fixed image upload function
  const handleImageUpload = async (file, type) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);
      
      const response = await userApi.updateProfileImage(username, formData);
      
      // Create object URL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      
      // Update the user state immediately with the object URL
      setUser(prev => ({
        ...prev,
        [type === 'profile' ? 'profile_image_url' : 'cover_image_url']: objectUrl
      }));

      // After successful upload, fetch the updated profile to get the real URL
      const updatedProfile = await userApi.getProfile(username);
      // Add a cache-busting query param so browsers and CDNs will fetch the
      // newest image instead of serving a cached copy. This ensures the
      // profile/cover updates are visible immediately after upload without
      // requiring a hard refresh.
      const appendCacheBuster = (u) => {
        try {
          if (!u || typeof u !== 'string') return u;
          const ts = Date.now();
          return u.includes('?') ? `${u}&v=${ts}` : `${u}?v=${ts}`;
        } catch (e) {
          return u;
        }
      };
      // Recompute full name for the updated profile too
      const uFirst = updatedProfile.first_name || updatedProfile.creator_first_name || updatedProfile.given_name || '';
      const uLast = updatedProfile.last_name || updatedProfile.creator_last_name || updatedProfile.family_name || '';
      const uExplicit = updatedProfile.get_full_name || updatedProfile.full_name || updatedProfile.name || updatedProfile.display_name || '';
      const uCombined = `${uFirst} ${uLast}`.trim();
      const uFullName = (uExplicit && uExplicit.trim()) || (uCombined && uCombined) || updatedProfile.username || '';

      // Inject cache-busted URLs into the updated profile before setting state
      if (updatedProfile.profile_image_url) {
        updatedProfile.profile_image_url = appendCacheBuster(updatedProfile.profile_image_url);
      }
      if (updatedProfile.cover_image_url) {
        updatedProfile.cover_image_url = appendCacheBuster(updatedProfile.cover_image_url);
      }

      setUser(prev => ({
        ...prev,
        ...updatedProfile,
        get_full_name: uFullName
      }));

      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 overflow-y-auto">
      {/* Cover Image Section */}
      <div className="relative h-[200px] md:h-[315px] bg-gradient-to-br from-slate-900/60 to-indigo-900/60 overflow-hidden">
        {user.cover_image_url ? (
          <SmartImg
            src={absoluteUrl(user.cover_image_url) || ''}
            alt="Cover"
            fill
            className="object-cover object-center opacity-70 cursor-pointer"
            onClick={() => setImageModal({ visible: true, url: user.cover_image_url, type: 'cover' })}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl text-cyan-500/20">
              <i className="fas fa-image"></i>
            </div>
          </div>
        )}
        {currentUser?.username === username && (
          <button 
            onClick={triggerCoverImageUpload}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-slate-900/60 flex items-center justify-center text-cyan-500 cursor-pointer hover:bg-cyan-500/20 transition-colors z-10 border border-cyan-500/30"
          >
            <i className="fas fa-camera text-2xl"></i>
            <input 
              ref={coverFileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleImageUpload(e.target.files[0], 'cover');
                }
              }}
            />
          </button>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="container mx-auto px-4 relative">
        <div className="flex gap-6 mb-6">
          {/* Profile Image - Positioned to overlap cover photo */}
          <div className="relative -mt-16 z-20 shrink-0">
            {user.profile_image_url ? (
              <SmartImg
                src={absoluteUrl(user.profile_image_url) || ''}
                alt={user.username}
                width={130}
                height={130}
                className="rounded-full object-cover border-4 border-cyan-500/30 shadow-lg cursor-pointer w-32 h-32"
                style={{ objectFit: 'cover' }}
                onClick={() => setImageModal({ visible: true, url: user.profile_image_url, type: 'profile' })}
              />
            ) : (
                <div className="w-32 h-32 rounded-full border-4 border-cyan-500/30 shadow-lg flex items-center justify-center bg-gradient-to-br from-cyan-500/30 to-blue-500/30">
                <span className="text-4xl font-bold text-cyan-500">
                  {getInitial(user?.username, '')}
                </span>
              </div>
            )}
            {currentUser?.username === username && (
              <button 
                onClick={triggerProfileImageUpload}
                className="absolute bottom-1 right-1 w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center text-cyan-500 cursor-pointer hover:bg-cyan-500/40 transition-colors border border-cyan-500/50 shadow-lg"
              >
                <i className="fas fa-camera text-lg"></i>
                <input 
                  ref={profileFileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleImageUpload(e.target.files[0], 'profile');
                    }
                  }}
                />
              </button>
            )}
          </div>
          
          {/* Profile Details - Aligned with middle of profile picture */}
          <div className="flex-1 text-left min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 text-white break-words pr-4">{getDisplayName(user)}</h1>
            <p className="text-sm sm:text-base text-gray-400 mb-2 break-words">@{user.username}</p>
            {user.bio && (
              <p className="mb-4 max-w-2xl text-gray-300 text-sm sm:text-base">{user.bio}</p>
            )}
            <div className="flex items-center gap-3">
              {user.rank !== undefined && (
                <button 
                  onClick={() => setLeaderboardModal(true)}
                  className="inline-block px-3 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500"
                >
                  Leaderboard Rank: #{user.rank} <i className="fas fa-trophy ml-1"></i>
                </button>
              )}
              {/* Action Buttons */}
              {currentUser && currentUser.username === username ? (
                <Link
                  href="/settings/profile"
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-pencil-alt text-xs"></i>
                  Edit Profile
                </Link>
              ) : currentUser && (
                <button 
                  onClick={handleFollow}
                  className={`px-4 py-1 rounded-full text-xs font-bold ${
                    isFollowing 
                      ? 'border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                  } transition-all`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Leaderboard Section - HIDDEN but kept for future use */}
        {user.is_finalized && (
          <div style={{ display: 'none' }} className="hidden-weekly-banner">
            <WeeklyWinnersBanner 
              winners={user.leaderboard_top?.slice(0, 3) || []} 
              isFinalized={user.is_finalized}
            />
          </div>
        )}

        {/* User Rank Card - HIDDEN but kept for future use */}
        {currentUser?.username === username && user.rank && (
          <div style={{ display: 'none' }} className="hidden-user-rank">
            <UserRankCard
              rank={user.rank}
              weeklyScore={user.weekly_score || 0}
              lifetimeScore={user.lifetime_score || 0}
              weekNumber={user.week_number || 1}
              year={user.year || new Date().getFullYear()}
              totalUsers={user.leaderboard_top?.length || 0}
            />
          </div>
        )}

        {/* Weekly Progress Bar - HIDDEN but kept for future use */}
        {currentUser?.username === username && (
          <div style={{ display: 'none' }} className="hidden-weekly-progress">
            <WeeklyProgressBar
              weekNumber={user.week_number || 1}
              year={user.year || new Date().getFullYear()}
              isFinalized={user.is_finalized}
            />
          </div>
        )}

        {/* Badges Section */}
        {user.badges && user.badges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
              Badges & Achievements
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {user.badges.map((badge, index) => {
                const badgeIconUrl = getImageUrl(badge.icon_url);
                return (
                  <div 
                    key={index} 
                    className="flex flex-col items-center min-w-[60px] cursor-pointer"
                    onClick={() => setBadgeModal({ visible: true, badge })}
                  >
                    {badgeIconUrl ? (
                      <SmartImg
                        src={absoluteUrl(badgeIconUrl)}
                        alt={badge.name}
                        width={40}
                        height={40}
                        className="rounded-full mb-1"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white mb-1">
                        🏅
                      </div>
                    )}
                    <span className="text-xs text-white text-center">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center md:justify-start gap-8 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-500">{stories.length}</div>
            <div className="text-sm text-gray-400">Stories</div>
          </div>
          <button 
            onClick={() => setFollowersModal({ visible: true, type: 'followers' })}
            className="text-center"
          >
            <div className="text-2xl font-bold text-cyan-500">{user.followers_count || 0}</div>
            <div className="text-sm text-gray-400">Followers</div>
          </button>
          <button 
            onClick={() => setFollowersModal({ visible: true, type: 'following' })}
            className="text-center"
          >
            <div className="text-2xl font-bold text-cyan-500">{user.following_count || 0}</div>
            <div className="text-sm text-gray-400">Following</div>
          </button>
        </div>

        {/* Content Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`pb-2 px-1 ${activeTab === 'posts' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-th mr-2"></i>Stories
            </button>
            <button 
              onClick={() => setActiveTab('verses')}
              className={`pb-2 px-1 ${activeTab === 'verses' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-align-left mr-2"></i>Verses
            </button>
            <button 
              onClick={() => setActiveTab('contributions')}
              className={`pb-2 px-1 ${activeTab === 'contributions' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-handshake mr-2"></i>Contributions
            </button>
            {/* Only show Saved tab if viewing current user's profile */}
            {currentUser?.username === username && (
              <button 
                onClick={() => setActiveTab('saved')}
                className={`pb-2 px-1 ${activeTab === 'saved' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
              >
                <i className="fas fa-bookmark mr-2"></i>Saved
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
                        <img
                          src={absoluteUrl(coverImageUrl)}
                          alt={story.title}
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
                        <div className="flex gap-3 text-sm text-gray-400">
                          <span><i className="fas fa-heart mr-1 text-cyan-500"></i>{story.likes_count || 0}</span>
                          <span><i className="fas fa-comment mr-1 text-purple-500"></i>{story.comments_count || 0}</span>
                          <span><i className="fas fa-share mr-1 text-blue-500"></i>{story.shares_count || 0}</span>
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
                          <img src={thumb} alt={verse.title || 'Verse image'} className="w-full h-full object-cover" />
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
                            <img src={thumb} alt={verse.title || 'Verse image'} className="w-full h-full object-cover" />
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
                          <img
                            src={absoluteUrl(coverImageUrl)}
                            alt={story.title}
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
                          <div className="flex gap-3 text-sm text-gray-400">
                            <span><i className="fas fa-heart mr-1 text-cyan-500"></i>{story.likes_count || 0}</span>
                            <span><i className="fas fa-comment mr-1 text-purple-500"></i>{story.comments_count || 0}</span>
                            <span><i className="fas fa-share mr-1 text-blue-500"></i>{story.shares_count || 0}</span>
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

        {/* Story Feed Modal - TikTok Style (use homepage feed layout but keep StoryCard styles unchanged) */}
        {storyFeedModal.visible && (
          <div className="fixed inset-0 z-[9999] bg-black">
            {/* Close button */}
            <button 
              onClick={() => setStoryFeedModal({ visible: false, initialIndex: 0 })}
              className="fixed top-4 right-4 z-[10000] w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
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
                        onFollowUser={handleFollowUser}
                        onDeleteStory={handleDeleteStory}
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

        {/* Followers/Following Modal with Follow/Unfollow Buttons */}
        {followersModal.visible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 capitalize">
                  {followersModal.type}
                </h2>
                <button 
                  onClick={() => setFollowersModal({ visible: false, type: 'followers' })}
                  className="w-10 h-10 rounded-full bg-slate-900/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                {(followersModal.type === 'followers' ? followers : following).map((user, i) => {
                  const profileImageUrl = getImageUrl(user.profile_image_url);
                  const isCurrentUserFollowing = currentUserFollowing.includes(user.username);
                  const displayName = user.account_type === 'brand' && user.brand_name
                    ? user.brand_name
                    : user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.first_name || user.last_name || user.username;
                  
                  return (
                    <div key={i} className="flex items-center justify-between bg-slate-900/60 rounded-2xl p-3 border border-cyan-500/20">
                      <Link href={`/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                          {profileImageUrl ? (
                          <SmartImg
                            src={absoluteUrl(profileImageUrl)}
                            alt={user.username}
                            width={40}
                            height={40}
                            className="rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center shrink-0">
                            <span className="text-cyan-500 font-bold">
                              {getInitial(user?.username, 'U')}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white truncate">{displayName}</div>
                          <div className="text-sm text-gray-400 truncate">@{user.username}</div>
                        </div>
                      </Link>
                      
                      {/* Follow/Unfollow Button */}
                      {currentUser && currentUser.username !== user.username && (
                        <button 
                          onClick={() => handleFollowUser(user)}
                          className={`px-3 py-1 rounded-xl text-sm font-medium shrink-0 ml-2 ${
                            isCurrentUserFollowing 
                              ? 'border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                          } transition-all`}
                        >
                          {isCurrentUserFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {imageModal.visible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
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

        {badgeModal.visible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-6 flex flex-col items-center animate-bounce-in max-w-sm w-full mx-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white text-3xl mb-4">
                {badgeModal.badge?.icon_url ? (
                  <SmartImg
                    src={absoluteUrl(badgeModal.badge.icon_url) || ''}
                    alt={badgeModal.badge.name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <span>🏅</span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                {badgeModal.badge?.name || 'Badge Unlocked!'}
              </h2>
              <p className="text-base text-white text-center mb-4">
                {badgeModal.badge?.description || ''}
              </p>
              <button 
                onClick={() => setBadgeModal({ visible: false, badge: null })}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {leaderboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-6 flex flex-col items-center w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">🏆 Leaderboard</h2>
              <div className="text-xs text-gray-500 mb-3">Top {user.leaderboard_top?.length || 0} Users</div>
              {user.leaderboard_top && user.leaderboard_top.length > 0 ? (
                <div className="flex flex-col gap-2 w-full max-h-96 overflow-y-auto custom-scrollbar">
                  {user.leaderboard_top.map((entry, index) => {
                    const profileImageUrl = getImageUrl(entry.profile_image_url);
                    const isCurrentUser = currentUser?.username === entry.username;
                    const score = entry.finalized_score || entry.weekly_score || entry.total_engagement || 0;
                    return (
                      <Link 
                        key={`${entry.username}-${entry.rank}-${index}`}
                        href={`/${entry.username}`}
                        className={`flex items-center gap-3 py-3 px-4 rounded-2xl transition-colors border ${
                          isCurrentUser
                            ? 'bg-cyan-500/20 border-cyan-500/60 ring-1 ring-cyan-500/40'
                            : 'bg-slate-900/60 hover:bg-slate-800/60 border-cyan-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-center w-8">
                          {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                          {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                          {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                          {entry.rank > 3 && <span className="font-bold text-white">#{entry.rank}</span>}
                        </div>
                        {profileImageUrl ? (
                          <SmartImg
                            src={absoluteUrl(profileImageUrl)}
                            alt={entry.username}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white text-xs font-bold">
                            {getInitial(entry?.username, '')}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white truncate block">{entry.username}</span>
                          <span className="text-xs text-gray-400">
                            {entry.display_name && entry.display_name !== entry.username ? entry.display_name : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-cyan-400 font-semibold block">⚡ {score}</span>
                          {entry.lifetime_score && (
                            <span className="text-xs text-purple-400">✨ {entry.lifetime_score}</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="mb-2">No leaderboard data available yet</p>
                  <p className="text-xs">Users will appear as they gain engagement</p>
                </div>
              )}
              <button 
                onClick={() => setLeaderboardModal(false)}
                className="mt-4 px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
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