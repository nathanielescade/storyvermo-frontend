// pages/profile/[username].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { fetchUserData, fetchUserStories, followUser, uploadProfileImage } from '../../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  
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

  useEffect(() => {
    if (username) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const userData = await fetchUserData(username);
          const storiesData = await fetchUserStories(username);
          
          setUser(userData);
          setStories(storiesData.stories || []);
          setVerses(storiesData.verses || []);
          setSavedStories(storiesData.saved_stories || []);
          setFollowers(storiesData.followers || []);
          setFollowing(storiesData.following || []);
          setIsFollowing(storiesData.is_following || false);
        } catch (error) {
          console.error('Error fetching profile data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [username]);

  const handleFollow = async () => {
    try {
      const response = await followUser(username);
      setIsFollowing(response.is_following);
      setFollowers(response.followers);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleImageUpload = async (file, type) => {
    try {
      const response = await uploadProfileImage(file, type);
      if (response.success) {
        // Update user state with new image
        setUser(prev => ({
          ...prev,
          [type === 'profile' ? 'profile_image_url' : 'cover_image_url']: response.url
        }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const openBadgeModal = (badge) => {
    setBadgeModal({ visible: true, badge });
  };

  const closeBadgeModal = () => {
    setBadgeModal({ visible: false, badge: null });
  };

  const openLeaderboardModal = () => {
    setLeaderboardModal(true);
  };

  const closeLeaderboardModal = () => {
    setLeaderboardModal(false);
  };

  const openFollowersModal = (type) => {
    setFollowersModal({ visible: true, type });
  };

  const closeFollowersModal = () => {
    setFollowersModal({ visible: false, type: 'followers' });
  };

  const openImageModal = (url, type) => {
    setImageModal({ visible: true, url, type });
  };

  const closeImageModal = () => {
    setImageModal({ visible: false, type: null, url: '' });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading profile...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">User not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <Head>
        <title>{`${user.get_full_name || user.username} - StoryVermo`}</title>
        <meta name="description" content={user.meta_description} />
        <meta name="author" content={user.get_full_name || user.username} />
        <meta name="keywords" content={`StoryVermo, ${user.get_full_name || user.username}, storyteller, creative writer, stories, verses`} />
        <link rel="canonical" href={user.meta_canonical_url} />
        
        {/* OpenGraph meta tags */}
        <meta property="og:title" content={user.meta_title} />
        <meta property="og:description" content={user.meta_description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={user.meta_canonical_url} />
        <meta property="og:image" content={user.meta_image_url} />
        <meta property="og:site_name" content="StoryVermo" />
        <meta property="profile:username" content={user.username} />
        {user.first_name && <meta property="profile:first_name" content={user.first_name} />}
        {user.last_name && <meta property="profile:last_name" content={user.last_name} />}
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={user.meta_title} />
        <meta name="twitter:description" content={user.meta_description} />
        <meta name="twitter:image" content={user.meta_image_url} />
        <meta name="twitter:site" content="@storyvermo" />
        {user.twitter_handle && <meta name="twitter:creator" content={`@${user.twitter_handle}`} />}
        
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "@id": user.meta_canonical_url,
              "name": `${user.first_name} ${user.last_name || user.username}`,
              "givenName": user.first_name,
              "familyName": user.last_name || "",
              "alternateName": `@${user.username}`,
              ...(user.bio && { "description": user.bio }),
              ...(user.profile_image_url && { "image": user.profile_image_url }),
              ...(user.website && { "url": user.website }),
              "mainEntityOfPage": {
                "@type": "ProfilePage",
                "@id": user.meta_canonical_url
              },
              "identifier": {
                "@type": "PropertyValue",
                "propertyID": "StoryVermo username",
                "value": user.username
              },
              ...(user.location && {
                "homeLocation": {
                  "@type": "Place",
                  "name": user.location
                }
              })
            })
          }}
        />
      </Head>

      {/* Badge Notification Modal */}
      {badgeModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#23284a] rounded-lg shadow-lg p-6 flex flex-col items-center animate-bounce-in">
            <div className="w-16 h-16 rounded-full bg-[#23284a] flex items-center justify-center text-white text-3xl mb-4">
              {badgeModal.badge?.icon_url ? (
                <Image 
                  src={badgeModal.badge.icon_url} 
                  alt={badgeModal.badge.name} 
                  width={64} 
                  height={64} 
                  className="rounded-full"
                />
              ) : (
                <span>🏅</span>
              )}
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#00d4ff' }}>
              {badgeModal.badge?.name || 'Badge Unlocked!'}
            </h2>
            <p className="text-base text-white text-center mb-4">
              {badgeModal.badge?.description || ''}
            </p>
            <button 
              onClick={closeBadgeModal}
              className="px-4 py-2 rounded-lg font-bold"
              style={{ background: 'linear-gradient(90deg, #00d4ff 0%, #9d00ff 100%)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#23284a] rounded-lg shadow-lg p-6 flex flex-col items-center w-full max-w-md">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#9d00ff' }}>Leaderboard</h2>
            <div className="flex flex-col gap-2 w-full max-h-80 overflow-y-auto">
              {user.leaderboard_top?.map((entry, index) => (
                <Link 
                  key={index} 
                  href={`/${entry.username}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#181c2f] hover:bg-[#23284a] transition-colors"
                >
                  <span className="font-bold text-white">#{entry.rank}</span>
                  {entry.profile_image_url ? (
                    <Image 
                      src={entry.profile_image_url} 
                      alt={entry.username} 
                      width={32} 
                      height={32} 
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#23284a] flex items-center justify-center text-white">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-white">{entry.username}</span>
                  <span className="text-xs text-gray-400">Engagement: {entry.total_engagement}</span>
                </Link>
              ))}
            </div>
            <button 
              onClick={closeLeaderboardModal}
              className="mt-4 px-4 py-2 rounded-lg font-bold"
              style={{ background: 'linear-gradient(90deg, #00d4ff 0%, #9d00ff 100%)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Followers/Following Modal */}
      {followersModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#181c2f] rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button 
              onClick={closeFollowersModal}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-center capitalize">
              {followersModal.type}
            </h2>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {(followersModal.type === 'followers' ? followers : following).map((user, index) => (
                <div key={index} className="flex items-center justify-between bg-[#23284a] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.profile_image_url ? (
                      <Image 
                        src={user.profile_image_url} 
                        alt={user.username} 
                        width={48} 
                        height={48} 
                        className="rounded-full border border-[#00d4ff]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#00d4ff]/40 to-[#9d00ff]/40 text-lg font-bold text-white border border-[#00d4ff]">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link href={`/${user.username}`} className="font-semibold text-white hover:underline">
                        {user.get_full_name || user.username}
                      </Link>
                      <div className="text-xs text-gray-400">@{user.username}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleFollow(user.username)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      user.is_following 
                        ? 'bg-transparent border border-[#00d4ff] text-[#00d4ff]' 
                        : 'text-white'
                    }`}
                    style={{ 
                      background: user.is_following 
                        ? 'transparent' 
                        : 'linear-gradient(90deg, #00d4ff 0%, #9d00ff 100%)' 
                    }}
                  >
                    {user.is_following ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-85">
          <div className="bg-[#23284a] rounded-lg shadow-lg p-6 flex flex-col items-center max-w-3xl w-full">
            <Image 
              src={imageModal.url} 
              alt="Full Image" 
              width={800} 
              height={600} 
              className="max-w-full max-h-[60vh] rounded-lg mb-4"
            />
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  // Implement delete functionality
                  closeImageModal();
                }}
                className="px-4 py-2 rounded-lg font-bold"
                style={{ background: 'linear-gradient(90deg, #ff3b3b 0%, #ff8c00 100%)' }}
              >
                Delete
              </button>
              <button 
                onClick={closeImageModal}
                className="px-4 py-2 rounded-lg font-bold"
                style={{ background: 'linear-gradient(90deg, #00d4ff 0%, #9d00ff 100%)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Cover Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-[#151937] to-[#0a0e27] overflow-hidden">
        {user.cover_image_url ? (
          <Image 
            src={user.cover_image_url} 
            alt="Cover" 
            fill
            className="object-cover opacity-70 cursor-pointer"
            onClick={() => openImageModal(user.cover_image_url, 'cover')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl text-white/20">
              <i className="fas fa-image"></i>
            </div>
          </div>
        )}
        <label className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-black/70 flex items-center justify-center text-white cursor-pointer hover:bg-[#00d4ff] hover:text-[#181c2f] transition-colors z-10">
          <i className="fas fa-camera text-2xl"></i>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleImageUpload(e.target.files[0], 'cover');
              }
            }}
          />
        </label>
      </div>

      {/* Profile Info Section */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
          {/* Profile Avatar */}
          <div className="relative">
            {user.profile_image_url ? (
              <Image 
                src={user.profile_image_url} 
                alt={user.username} 
                width={130} 
                height={130} 
                className="rounded-full border-4 border-[#0a0e27] shadow-lg cursor-pointer"
                onClick={() => openImageModal(user.profile_image_url, 'profile')}
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-[#0a0e27] shadow-lg flex items-center justify-center bg-[#181c2f]">
                <span className="text-4xl font-bold" style={{ color: '#00d4ff' }}>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-black"></div>
            <label className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-black/70 flex items-center justify-center text-white cursor-pointer hover:bg-[#00d4ff] hover:text-[#181c2f] transition-colors">
              <i className="fas fa-camera text-xl"></i>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleImageUpload(e.target.files[0], 'profile');
                  }
                }}
              />
            </label>
          </div>

          {/* Profile Details */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-1">{user.get_full_name || user.username}</h1>
            <p className="text-gray-400 mb-2">@{user.username}</p>
            {user.bio && (
              <p className="mb-4 max-w-2xl" style={{ color: '#e0e0e0' }}>{user.bio}</p>
            )}
            {user.leaderboard_rank && (
              <div className="mb-2">
                <button 
                  onClick={openLeaderboardModal}
                  className="inline-block px-3 py-1 rounded-full text-white text-xs font-bold cursor-pointer"
                  style={{ background: 'linear-gradient(to right, #00d4ff, #9d00ff)' }}
                >
                  Leaderboard Rank: #{user.leaderboard_rank} <i className="fas fa-trophy ml-1"></i>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isFollowing ? (
              <button 
                onClick={handleFollow}
                className="px-4 py-2 rounded-lg font-medium border border-[#00d4ff] text-[#00d4ff]"
              >
                Following
              </button>
            ) : (
              <button 
                onClick={handleFollow}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: 'linear-gradient(90deg, #00d4ff 0%, #9d00ff 100%)' }}
              >
                Follow
              </button>
            )}
            <button 
              onClick={() => router.push('/settings')}
              className="px-4 py-2 rounded-lg font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              <i className="fas fa-edit mr-2"></i>Edit Profile
            </button>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="flex justify-center md:justify-start gap-8 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#00d4ff' }}>{stories.length}</div>
            <div className="text-sm text-gray-400 uppercase">Posts</div>
          </div>
          <div className="text-center">
            <button 
              onClick={() => openFollowersModal('followers')}
              className="text-2xl font-bold underline" 
              style={{ color: '#00d4ff' }}
            >
              {followers.length}
            </button>
            <div className="text-sm text-gray-400 uppercase">Followers</div>
          </div>
          <div className="text-center">
            <button 
              onClick={() => openFollowersModal('following')}
              className="text-2xl font-bold underline" 
              style={{ color: '#00d4ff' }}
            >
              {following.length}
            </button>
            <div className="text-sm text-gray-400 uppercase">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#00d4ff' }}>{user.likes_count || 0}</div>
            <div className="text-sm text-gray-400 uppercase">Likes</div>
          </div>
        </div>

        {/* Badges Section */}
        {user.badges && user.badges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3" style={{ color: '#00d4ff' }}>Badges & Achievements</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {user.badges.map((badge, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center min-w-[60px] cursor-pointer"
                  onClick={() => openBadgeModal(badge)}
                >
                  {badge.icon_url ? (
                    <Image 
                      src={badge.icon_url} 
                      alt={badge.name} 
                      width={40} 
                      height={40} 
                      className="rounded-full mb-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#23284a] flex items-center justify-center text-white mb-1">
                      🏅
                    </div>
                  )}
                  <span className="text-xs text-white text-center">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`pb-2 px-1 ${activeTab === 'posts' ? 'text-[#00d4ff] border-b-2 border-[#00d4ff]' : 'text-gray-400'}`}
            >
              <i className="fas fa-th mr-2"></i>Posts
            </button>
            <button 
              onClick={() => setActiveTab('verses')}
              className={`pb-2 px-1 ${activeTab === 'verses' ? 'text-[#00d4ff] border-b-2 border-[#00d4ff]' : 'text-gray-400'}`}
            >
              <i className="fas fa-align-left mr-2"></i>Verses
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`pb-2 px-1 ${activeTab === 'saved' ? 'text-[#00d4ff] border-b-2 border-[#00d4ff]' : 'text-gray-400'}`}
            >
              <i className="fas fa-bookmark mr-2"></i>Saved
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="mb-12">
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div>
              {stories.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {stories.map((story, index) => (
                    <div 
                      key={index} 
                      className="rounded-lg overflow-hidden bg-gradient-to-br from-[#151937] to-[#0a0e27] border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 transition-all cursor-pointer hover:-translate-y-1"
                      onClick={() => router.push(`/story/${story.slug}`)}
                    >
                      {story.cover_image ? (
                        <Image 
                          src={story.cover_image.file_url} 
                          alt={story.title} 
                          width={300} 
                          height={200} 
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-[#00d4ff]/20 to-[#9d00ff]/20 flex items-center justify-center">
                          <i className="fas fa-image text-4xl text-white/20"></i>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-bold mb-1 truncate">{story.title}</h3>
                        <div className="flex gap-3 text-sm text-gray-400">
                          <span><i className="fas fa-heart mr-1"></i>{story.likes_count}</span>
                          <span><i className="fas fa-comment mr-1"></i>{story.comments_count}</span>
                          <span><i className="fas fa-share mr-1"></i>{story.shares_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4" style={{ color: '#00d4ff', opacity: 0.5 }}>
                    <i className="fas fa-book-open"></i>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-gray-400">{user.username} hasn't published any stories.</p>
                </div>
              )}
            </div>
          )}

          {/* Verses Tab */}
          {activeTab === 'verses' && (
            <div>
              {verses.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {verses.map((verse, index) => (
                    <div 
                      key={index} 
                      className="rounded-lg overflow-hidden bg-gradient-to-br from-[#151937] to-[#0a0e27] border border-[#00d4ff]/20 p-4"
                    >
                      <Link href={`/verses/${verse.slug}`} className="font-bold mb-2 block">
                        {verse.content.substring(0, 60)}...
                      </Link>
                      <div className="flex gap-3 text-sm text-gray-400">
                        <span><i className="fas fa-heart mr-1"></i>{verse.likes_count}</span>
                        <span><i className="fas fa-comment mr-1"></i>{verse.comments_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 text-gray-400">
                    <i className="fas fa-align-left"></i>
                  </div>
                  <p className="text-gray-400">No verses yet</p>
                </div>
              )}
            </div>
          )}

          {/* Saved Tab */}
          {activeTab === 'saved' && (
            <div>
              {savedStories.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {savedStories.map((story, index) => (
                    <div 
                      key={index} 
                      className="rounded-lg overflow-hidden bg-gradient-to-br from-[#151937] to-[#0a0e27] border border-[#00d4ff]/20 hover:border-[#00d4ff]/50 transition-all cursor-pointer hover:-translate-y-1"
                      onClick={() => router.push(`/story/${story.slug}`)}
                    >
                      {story.cover_image ? (
                        <Image 
                          src={story.cover_image.file_url} 
                          alt={story.title} 
                          width={300} 
                          height={200} 
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-[#00d4ff]/20 to-[#9d00ff]/20 flex items-center justify-center">
                          <i className="fas fa-image text-4xl text-white/20"></i>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-bold mb-1 truncate">{story.title}</h3>
                        <div className="flex gap-3 text-sm text-gray-400">
                          <span><i className="fas fa-heart mr-1"></i>{story.likes_count}</span>
                          <span><i className="fas fa-comment mr-1"></i>{story.comments_count}</span>
                          <span><i className="fas fa-share mr-1"></i>{story.shares_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 text-gray-400">
                    <i className="fas fa-bookmark"></i>
                  </div>
                  <p className="text-gray-400">No saved stories yet</p>
                </div>
              )}
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
      `}</style>
    </div>
  );
}