'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { storiesApi } from '../../../lib/api';
import StoryCard from '../components/StoryCard';
import AuthModal from '../components/AuthModal';

const SavedPageClient = () => {
  const router = useRouter();
  const { isAuthenticated, currentUser } = useAuth();
  const [savedStories, setSavedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalContext, setAuthModalContext] = useState(null);

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
    };    fetchSavedStories();
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
    <div className="min-h-screen bg-gray-900 pt-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Saved Stories</h1>
          <p className="text-gray-400">Stories you&apos;ve bookmarked for later</p>
        </div>

        {loading ? (
          // Loading state
          <div className="py-16 text-center text-gray-400">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
            <p>Loading your saved stories...</p>
          </div>
        ) : savedStories.length > 0 ? (
          // Grid of saved stories
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedStories.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                index={index}
                viewType="feed"
                isAuthenticated={isAuthenticated}
                openAuthModal={openAuthModal}
                onSaveToggle={() => handleSaveToggle(story)}
              />
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
    </div>
  );
};

export default SavedPageClient;