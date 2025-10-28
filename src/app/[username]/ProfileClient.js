'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { userApi, storiesApi, absoluteUrl } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import StoryCard from '../components/StoryCard';

export default function ProfileClient({ username }) {
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [verses, setVerses] = useState([]);
  const [savedStories, setSavedStories] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [badgeModal, setBadgeModal] = useState({ visible: false, badge: null });
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [followersModal, setFollowersModal] = useState({ visible: false, type: 'followers' });
  const [imageModal, setImageModal] = useState({ visible: false, type: null, url: '' });
  
  // New state for story feed modal
  const [storyFeedModal, setStoryFeedModal] = useState({ visible: false, initialIndex: 0 });
  
  // Refs for file inputs
  const profileFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  
  // State for current user's following list
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();

  // Fetch current user's following list
  const fetchCurrentUserFollowing = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.username) return;
    
    try {
      const response = await userApi.getFollowing(currentUser.username);
      setCurrentUserFollowing(response.map(user => user.username));
    } catch (error) {
      console.error('Error fetching current user following list:', error);
    }
  }, [isAuthenticated, currentUser?.username]);

  // In the fetchProfile function in ProfileClient.js
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile(username);
      
      console.log('Profile API URL:', `/api/profiles/${username}/`);
      console.log('Profile API Full Response:', response);
      
      const userData = {
        ...response,
        get_full_name: `${response.first_name || ''} ${response.last_name || ''}`.trim() || response.username,
      };
      setUser(userData);

      // Handle stories data - it should now be included in the response
      setStories(response.stories || []);
      setVerses(response.verses || []);
      setSavedStories(response.saved_stories || []);
      setFollowers(response.followers || []);
      setFollowing(response.following || []);
      
      if (currentUser?.username !== username) {
        setIsFollowing(!!response.is_following);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
    } finally {
      setLoading(false);
    }
  }, [username, currentUser?.username]);

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
      console.error(`Error fetching ${type}:`, error);
    }
  }, [username]);

  useEffect(() => {
    if (username) fetchProfile();
    if (isAuthenticated) fetchCurrentUserFollowing();
  }, [username, fetchProfile, isAuthenticated, fetchCurrentUserFollowing]);

  // When followers modal is opened, fetch the data
  useEffect(() => {
    if (followersModal.visible) {
      fetchFollowersData(followersModal.type);
    }
  }, [followersModal.visible, followersModal.type, fetchFollowersData]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      const response = await userApi.followUser(username);
      setIsFollowing(response.is_following);
      setFollowers(prev => response.is_following 
        ? [...prev, currentUser]
        : prev.filter(f => f.username !== currentUser.username)
      );
      // Update current user's following list
      if (response.is_following) {
        setCurrentUserFollowing(prev => [...prev, username]);
      } else {
        setCurrentUserFollowing(prev => prev.filter(u => u !== username));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Handle following/unfollowing a user in the modal
// ProfileClient.js - handleFollowUser function
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
    } catch (error) {
        console.error('Error following user:', error);
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
      setUser(prev => ({
        ...prev,
        ...updatedProfile,
        get_full_name: `${updatedProfile.first_name || ''} ${updatedProfile.last_name || ''}`.trim() || updatedProfile.username
      }));

      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
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
      console.error('Error toggling like:', error);
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
      console.error('Error toggling save:', error);
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
          <Image 
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
              <Image 
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
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {currentUser?.username === username && (
              <button 
                onClick={triggerProfileImageUpload}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-slate-900/60 flex items-center justify-center text-cyan-500 cursor-pointer hover:bg-cyan-500/20 transition-colors border border-cyan-500/30"
              >
                <i className="fas fa-camera"></i>
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 text-white break-words pr-4">{user.get_full_name || user.username}</h1>
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
              {currentUser && currentUser.username !== username && (
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
                      <Image 
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
              onClick={() => setActiveTab('saved')}
              className={`pb-2 px-1 ${activeTab === 'saved' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
            >
              <i className="fas fa-bookmark mr-2"></i>Saved
            </button>
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
                        <Image 
                          src={absoluteUrl(coverImageUrl)} 
                          alt={story.title} 
                          width={300} 
                          height={200} 
                          className="w-full h-40 object-cover" 
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                          <i className="fas fa-image text-4xl text-white/20"></i>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-bold mb-1 truncate text-white group-hover:text-cyan-300 transition-colors">{story.title}</h3>
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
                  const coverImageUrl = getImageUrl(verse.cover_image);
                  return (
                    <div 
                      key={verse.public_id || verse.slug || i}
                      onClick={(e) => handleStoryClick(e, i)}
                      className="cursor-pointer group"
                    >
                      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/60 to-indigo-900/60 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                        {coverImageUrl ? (
                          <Image 
                            src={absoluteUrl(coverImageUrl)} 
                            alt={verse.title || verse.story_title || "Verse"} 
                            width={300} 
                            height={200} 
                            className="w-full h-40 object-cover" 
                          />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <i className="fas fa-book-open text-4xl text-white/20"></i>
                          </div>
                        )}
                        <div className="p-3">
                          <h3 className="font-bold mb-1 truncate text-white group-hover:text-cyan-300 transition-colors">
                            {verse.title || verse.content || "Untitled Verse"}
                          </h3>
                          <div className="flex gap-3 text-sm text-gray-400">
                            <span><i className="fas fa-heart mr-1 text-cyan-500"></i>{verse.likes_count || 0}</span>
                            <span><i className="fas fa-comment mr-1 text-purple-500"></i>{verse.comments_count || 0}</span>
                            <span><i className="fas fa-share mr-1 text-blue-500"></i>{verse.shares_count || 0}</span>
                          </div>
                          {verse.story_title && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              From: {verse.story_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
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
                          <Image 
                            src={absoluteUrl(coverImageUrl)} 
                            alt={story.title} 
                            width={300} 
                            height={200} 
                            className="w-full h-40 object-cover" 
                          />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <i className="fas fa-image text-4xl text-white/20"></i>
                          </div>
                        )}
                        <div className="p-3">
                          <h3 className="font-bold mb-1 truncate text-white group-hover:text-cyan-300 transition-colors">{story.title}</h3>
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
                  <div className="image-feed">
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
                  const displayName = user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.first_name || user.last_name || user.username;
                  
                  return (
                    <div key={i} className="flex items-center justify-between bg-slate-900/60 rounded-2xl p-3 border border-cyan-500/20">
                      <Link href={`/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                        {profileImageUrl ? (
                          <Image 
                            src={absoluteUrl(profileImageUrl)} 
                            alt={user.username} 
                            width={40} 
                            height={40} 
                            className="rounded-full object-cover shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center shrink-0">
                            <span className="text-cyan-500 font-bold">
                              {user.username.charAt(0).toUpperCase()}
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
                <Image 
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
                  <Image 
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
              <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Leaderboard</h2>
              <div className="flex flex-col gap-2 w-full max-h-80 overflow-y-auto custom-scrollbar">
                {user.leaderboard_top?.map((entry, index) => {
                  const profileImageUrl = getImageUrl(entry.profile_image_url);
                  return (
                    <Link 
                      key={index} 
                      href={`/${entry.username}`}
                      className="flex items-center gap-3 py-2 px-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 transition-colors border border-cyan-500/20"
                    >
                      <span className="font-bold text-white">#{entry.rank}</span>
                      {profileImageUrl ? (
                        <Image 
                          src={absoluteUrl(profileImageUrl)} 
                          alt={entry.username} 
                          width={32} 
                          height={32} 
                          className="rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold text-white">{entry.username}</span>
                      <span className="text-xs text-gray-400">Engagement: {entry.total_engagement}</span>
                    </Link>
                  );
                })}
              </div>
              <button 
                onClick={() => setLeaderboardModal(false)}
                className="mt-4 px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium"
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