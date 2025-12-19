'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { storiesApi, absoluteUrl } from '../../../lib/api';
import StoryCard from '../components/StoryCard';
import AuthModal from '../components/AuthModal';

// SmartImg component for optimized images
function SmartImg({ src, alt = '', width, height, fill, className, style }) {
  if (!src) return null;
  const isObjectUrl = typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));

  if (isObjectUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...(style || {}), width: fill ? '100%' : 'auto', height: fill ? '100%' : 'auto', objectFit: 'cover' }}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }

  // If explicit width/height not provided, render Image with `fill` inside
  // a positioned container so Next Image has required sizing. We preserve
  // any sizing classes passed in `className` by applying them to the wrapper
  // and keep object-fit on the inner Image.
  if (!width || !height) {
    // Move sizing classes to wrapper and keep object-fit class for inner Image
    const innerClass = (className || '').split(' ').includes('object-cover') ? 'object-cover' : '';
    const wrapperClass = `relative ${className || 'w-full h-40'}`.replace(innerClass, '').trim();

    return (
      <div className={wrapperClass} style={{ position: 'relative', ...(style || {}) }}>
        <Image
          src={src}
          alt={alt}
          fill
          className={innerClass}
          style={{ objectFit: 'cover' }}
        />
      </div>
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
    />
  );
}

const StorySkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-slate-900/60 border border-cyan-500/20">
    <div className="w-full h-40 bg-slate-800 animate-pulse"></div>
    <div className="p-3">
      <div className="h-5 bg-slate-800 rounded w-3/4 animate-pulse mb-2"></div>
      <div className="flex gap-3">
        <div className="h-4 bg-slate-800 rounded w-12 animate-pulse"></div>
        <div className="h-4 bg-slate-800 rounded w-12 animate-pulse"></div>
        <div className="h-4 bg-slate-800 rounded w-12 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const SavedPageClient = () => {
  const router = useRouter();
  const { isAuthenticated, currentUser } = useAuth();
  const [savedStories, setSavedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalContext, setAuthModalContext] = useState(null);
  const [storyFeedModal, setStoryFeedModal] = useState({ visible: false, initialIndex: 0 });
  const feedContainerRef = useRef(null);

  // Fetch saved stories when component mounts
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchSavedStories = async () => {
      try {
        const stories = await storiesApi.getSavedStories();
        setSavedStories(stories);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchSavedStories();
  }, [isAuthenticated]);

  const openAuthModal = (action, context) => {
    setAuthModalContext({ action, context });
    setShowAuthModal(true);
  };

  // Handle story save toggle
  const handleSaveToggle = async (story) => {
    if (!isAuthenticated) {
      openAuthModal('save', { slug: story.slug });
      return;
    }

    // Optimistically update the UI
    setSavedStories(prev => prev.filter(s => s.id !== story.id));

    try {
      await storiesApi.toggleSaveBySlug(story.slug);
    } catch (error) {
      // Revert on error
      setSavedStories(prev => [...prev, story]);
    }
  };

  // Handle like toggle for saved stories (update local state)
  const handleLikeToggle = async (slug) => {
    try {
      await storiesApi.toggleLike(slug);
      setSavedStories(prev => prev.map(s => s.slug === slug ? ({
        ...s,
        isLiked: !s.isLiked,
        likes_count: s.isLiked ? (s.likes_count || 0) - 1 : (s.likes_count || 0) + 1
      }) : s));
    } catch (e) {
    }
  };

  // Handle clicking a story card to open feed modal at that index
  const handleStoryClick = (e, index) => {
    e && e.preventDefault && e.preventDefault();
    setStoryFeedModal({ visible: true, initialIndex: index });
  };

  // When the feed modal opens, scroll to the initial index
  useEffect(() => {
    if (!storyFeedModal.visible) return;
    const t = setTimeout(() => {
      try {
        if (!feedContainerRef.current) return;
        const children = feedContainerRef.current.querySelectorAll(':scope > *');
        const el = children[storyFeedModal.initialIndex];
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      } catch (e) {
      }
    }, 60);
    return () => clearTimeout(t);
  }, [storyFeedModal.visible, storyFeedModal.initialIndex]);

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 pt-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-white mb-4">Your Saved Stories</h1>
            <p className="text-gray-400 mb-8">Please log in to see your saved stories</p>
            <button
              onClick={() => openAuthModal('view-saved')}
              className="bg-gradient-to-r from-neon-blue to-neon-purple text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Log in to view saved stories
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          context={authModalContext}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 pt-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 p-6 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md rounded-2xl border border-cyan-500/30">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-2">Your Saved Stories</h1>
          <p className="text-gray-400">Stories you&apos;ve bookmarked for later</p>
        </div>

        {loading ? (
          // Loading state
          <div className="py-16 text-center text-gray-400">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
            <p>Loading your saved stories...</p>
          </div>
        ) : savedStories.length > 0 ? (
          // Grid of saved stories (match search page grid)
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedStories.map((story, index) => (
              <div
                key={story.id}
                onClick={(e) => handleStoryClick(e, index)}
                className="cursor-pointer group"
              >
                <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/60 to-indigo-900/60 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-[1.02]">
                  {story.cover_image_url ? (
                    <SmartImg
                      src={story.cover_image_url}
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
            ))}
          </div>
        ) : (
          // No saved stories state
          <div className="text-center py-16">
            <div className="text-6xl mb-4 text-gray-600">
              <i className="far fa-bookmark"></i>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No saved stories yet</h2>
            <p className="text-gray-400 mb-8">When you save stories, they&apos;ll appear here</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-neon-blue to-neon-purple text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Discover Stories
            </button>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        context={authModalContext}
      />
      
      {/* Story Feed Modal (reused) */}
      {storyFeedModal.visible && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <button
            onClick={() => setStoryFeedModal({ visible: false, initialIndex: 0 })}
            className="fixed top-20 right-4 z-[10100] w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>

          <div className="h-full overflow-y-auto">
            <div className="flex justify-center md:justify-start h-full">
              <div className="w-full md:pl-[280px]">
                <div className="image-feed" ref={feedContainerRef}>
                  {savedStories.map((story, index) => (
                    <StoryCard
                      key={story.slug || index}
                      story={story}
                      index={index}
                      viewType="feed"
                      onLikeToggle={() => handleLikeToggle(story.slug)}
                      onSaveToggle={() => handleSaveToggle(story)}
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
};

export default SavedPageClient;