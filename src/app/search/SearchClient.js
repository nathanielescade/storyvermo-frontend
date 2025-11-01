// src/app/search/SearchClient.js
'use client';
import { useState, useEffect, useMemo } from 'react';
import StoryCard from '../components/StoryCard';
import debounce from 'lodash/debounce';
import { searchApi, storiesApi, userApi, absoluteUrl } from '../../../lib/api'; 
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stories');
  const [results, setResults] = useState({
    stories: [],
    verses: [],
    creators: [],
    loading: false
  });
  const [error, setError] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // New state for story feed modal
  const [storyFeedModal, setStoryFeedModal] = useState({ visible: false, initialIndex: 0 });

  // Set isMounted to true when component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle search input changes
  const handleSearchInput = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    // Trigger debounced search immediately on user input for real-time results
    debouncedSearch(newQuery);
  };

  // Debounced search function (useMemo to keep same instance while router is stable)
  const debouncedSearch = useMemo(() => debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults(prev => ({ ...prev, stories: [], verses: [], creators: [], loading: false }));
        return;
      }

      try {
        setResults(prev => ({ ...prev, loading: true }));
        setError(null);
        
        // Use the searchApi functions instead of direct apiRequest calls
        const [storiesRes, versesRes, creatorsRes] = await Promise.allSettled([
          searchApi.searchStories(searchQuery),
          searchApi.searchVerses(searchQuery),
          searchApi.getRecommendedCreators(searchQuery)
        ]);

        // Process the results
        const newResults = {
          stories: storiesRes.status === 'fulfilled' && storiesRes.value ? storiesRes.value : [],
          verses: versesRes.status === 'fulfilled' && versesRes.value ? versesRes.value : [],
          creators: creatorsRes.status === 'fulfilled' && creatorsRes.value ? creatorsRes.value : [],
          loading: false
        };

        setResults(newResults);

        // Update URL with search query
        const newUrl = `/search?q=${encodeURIComponent(searchQuery)}`;
        router.push(newUrl, { scroll: false });
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to perform search. Please try again.');
        setResults(prev => ({ ...prev, loading: false }));
      }
    }, 120), [router]);

  // Ensure debounced search is cancelled on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      try { debouncedSearch.cancel(); } catch (e) { /* ignore */ }
    };
  }, [debouncedSearch]);

  // Initialize search from URL params after component mounts
  useEffect(() => {
    if (isMounted) {
      const initialQuery = searchParams.get('q') || '';
      setQuery(initialQuery);
      if (initialQuery) {
        debouncedSearch(initialQuery);
      }
    }
  }, [isMounted, searchParams, debouncedSearch]);

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
      setResults(prev => ({
        ...prev,
        stories: prev.stories.map(story => 
          story.slug === slug 
            ? { 
                ...story, 
                isLiked: !story.isLiked,
                likes_count: story.isLiked ? story.likes_count - 1 : story.likes_count + 1
              }
            : story
        )
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSaveToggle = async (slug) => {
    try {
      await storiesApi.toggleSave(slug);
      setResults(prev => ({
        ...prev,
        stories: prev.stories.map(story => 
          story.slug === slug 
            ? { ...story, isSaved: !story.isSaved }
            : story
        )
      }));
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await userApi.followUser(userId);
      // Update creators state if needed
      setResults(prev => ({
        ...prev,
        creators: prev.creators.map(creator => 
          creator.username === userId 
            ? { ...creator, is_following: !creator.is_following }
            : creator
        )
      }));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleDeleteStory = (slug) => {
    setResults(prev => ({
      ...prev,
      stories: prev.stories.filter(story => story.slug !== slug)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
              <i className="fas fa-search text-cyan-400 text-2xl"></i>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                SEARCH
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Find stories, verses, and creators
              </p>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleSearchInput}
              placeholder="Search for stories, verses, or creators..."
              autoFocus
              className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
            />
            <i className="fas fa-search absolute right-5 top-1/2 -translate-y-1/2 text-cyan-500/70" />
          </div>

          {/* Tabs */}
          <div className="flex mt-6 space-x-4 border-b border-gray-700">
            {['stories', 'verses', 'creators'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-2 capitalize ${
                  activeTab === tab
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-slate-200'
                } transition-all duration-300`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4 text-center">
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {results.loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="pb-20">
            {/* Stories Tab */}
            {activeTab === 'stories' && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.stories.length > 0 ? (
                  results.stories.map((story, index) => (
                    <div 
                      key={story.id || story.slug}
                      onClick={(e) => handleStoryClick(e, index)}
                      className="cursor-pointer group"
                    >
                      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/60 to-indigo-900/60 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                        {story.cover_image ? (
                          <img
                            src={absoluteUrl(story.cover_image.file_url || story.cover_image.url || story.cover_image)}
                            alt={story.title}
                            className="w-full h-40 object-cover"
                          />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <i className="fas fa-image text-4xl text-white/20"></i>
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-bold mb-2 truncate text-white group-hover:text-cyan-300 transition-colors">{story.title}</h3>
                          <div className="flex gap-3 text-sm text-gray-400">
                            <span><i className="fas fa-heart mr-1 text-cyan-500"></i>{story.likes_count || 0}</span>
                            <span><i className="fas fa-comment mr-1 text-purple-500"></i>{story.comments_count || 0}</span>
                            <span><i className="fas fa-share mr-1 text-blue-500"></i>{story.shares_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : query ? (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <i className="fas fa-search text-4xl mb-4 text-cyan-500/50" />
                    <h3 className="text-xl font-semibold mb-2 text-white">No stories found</h3>
                    <p>Try searching with different keywords</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Verses Tab */}
            {activeTab === 'verses' && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.verses.length > 0 ? (
                  results.verses.map((verse, index) => {
                    const id = verse.id || verse.public_id || verse.slug || '';
                    const storyObj = verse.story || {};
                    const storySlug = (typeof storyObj === 'string' ? storyObj : (storyObj.slug || storyObj.story_slug)) || verse.story_slug || '';
                    const storyTitle = (typeof storyObj === 'object' && storyObj) ? (storyObj.title || storyObj.story_title) : (verse.story_title || 'Story');
                    const excerpt = verse.content ? String(verse.content).slice(0,120) : '';

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
                        key={verse.id || verse.slug || index}
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
                                const name = verse.author?.username || verse.author_name || '';
                                if (!name) return 'U';
                                return name.split(' ').map(s => s[0]?.toUpperCase()).slice(0,2).join('');
                              })()}
                            </div>
                            <div className="text-xs text-white/90">{verse.author?.username || verse.author_name || 'Unknown'}</div>
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
                          <div className="text-sm text-gray-400 mb-1">{displayStoryTitle}</div>
                          <div className="text-white font-semibold mb-1 text-lg leading-tight">{displayTitle}</div>
                          <div className="text-xs text-gray-400 mb-2">in <span className="text-indigo-300">{displayStoryTitle}</span></div>
                        </div>
                      </Link>
                    );
                  })
                ) : query ? (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <i className="fas fa-search text-4xl mb-4 text-cyan-500/50" />
                    <h3 className="text-xl font-semibold mb-2 text-white">No verses found</h3>
                    <p>Try searching with different keywords</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Creators Tab */}
            {activeTab === 'creators' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.creators.length > 0 ? (
                  results.creators.map((creator) => (
                    <div
                      key={creator.id || creator.username}
                      className="flex items-center p-4 bg-slate-900/60 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer group"
                      onClick={() => router.push(`/${creator.username}`)}
                    >
                      {creator.profile_image_url ? (
                        <img
                          src={absoluteUrl(creator.profile_image_url)}
                          alt={creator.username}
                          className="w-16 h-16 rounded-full border-2 border-cyan-500/30"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center border-2 border-cyan-500/30">
                          <span className="text-2xl font-bold text-cyan-500">
                            {creator.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{creator.username}</h3>
                        <p className="text-sm text-slate-400">{creator.followers_count || 0} followers</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowUser(creator.username);
                          }}
                          className={`mt-2 px-4 py-1 rounded-full text-sm ${
                            creator.is_following
                              ? 'bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                          } transition-all`}
                        >
                          {creator.is_following ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : query ? (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <i className="fas fa-search text-4xl mb-4 text-cyan-500/50" />
                    <h3 className="text-xl font-semibold mb-2 text-white">No creators found</h3>
                    <p>Try searching with different keywords</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Story Feed Modal - TikTok Style */}
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
                {/* Reuse the homepage "image-feed" container so StoryCard renders the same size */}
                <div className="image-feed">
                  {activeTab === 'stories' && results.stories.map((story, index) => (
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
                  {activeTab === 'verses' && results.verses.map((verse, index) => (
                    <StoryCard
                      key={verse.slug || index}
                      story={verse}
                      index={index}
                      viewType="feed"
                      isVerse={true}
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
    </div>
  );
}