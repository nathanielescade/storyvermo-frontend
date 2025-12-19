// StoryCard.js - Lightweight Wrapper
// Composes server skeleton + client controls for optimal LCP

import dynamic from 'next/dynamic';
import StoryCardSkeleton from './storycard/StoryCardSkeleton';

// Dynamically import controls with no SSR to avoid hydration on initial load
const StoryCardControls = dynamic(() => import('./storycard/StoryCardControls'), {
  ssr: false,
  loading: () => null // Don't show a loading state, skeleton is already visible
});

export default function StoryCard({
    story,
    index,
    viewType = 'feed',
    onFollowUser,
    onOpenStoryVerses,
    onDeleteStory,
    currentTag,
    onTagSelect,
    isAuthenticated,
    openAuthModal
}) {
    // OPTIMIZED: Return skeleton IMMEDIATELY (server-rendered, no JS)
    // Then lazy-load controls client-side
    return (
        <div className="image-container story-card-wrapper">
            {/* Fast server skeleton - image loads immediately */}
            <StoryCardSkeleton
                story={story}
                index={index}
                viewType={viewType}
            />

            {/* Heavy client controls - loads after skeleton renders */}
            {viewType === 'feed' && (
                <StoryCardControls
                    story={story}
                    index={index}
                    viewType={viewType}
                    onFollowUser={onFollowUser}
                    onOpenStoryVerses={onOpenStoryVerses}
                    onDeleteStory={onDeleteStory}
                    currentTag={currentTag}
                    onTagSelect={onTagSelect}
                    isAuthenticated={isAuthenticated}
                    openAuthModal={openAuthModal}
                />
            )}
        </div>
    );
}
