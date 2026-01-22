import React from 'react';

const CollaborativeBadge = ({ story, isAuthenticated, onContributeClick }) => {
    if (!story.allow_contributions) {
        return null;
    }

    // Count unique authors/contributors
    const authors = new Set();
    if (story.creator) {
        authors.add(story.creator.id || story.creator.username);
    }
    
    if (Array.isArray(story.verses)) {
        story.verses.forEach(verse => {
            if (verse.author) {
                authors.add(verse.author.id || verse.author.username);
            }
        });
    }
    
    const contributorCount = authors.size - 1; // -1 for the original creator
    const hasContributors = contributorCount > 0;

    return (
        <div 
            className="collaborative-badge absolute top-4 left-4 z-20 bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm border border-pink-400/50 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/40 transition-all cursor-pointer group"
            onClick={onContributeClick}
            title="Click to contribute"
        >
            <div className="flex items-center gap-1.5">
                <span className="fas fa-users text-white text-sm group-hover:scale-110 transition-transform"></span>
                <span className="text-white text-xs font-semibold">
                    {hasContributors ? `${authors.size} Contributors` : 'Open to Collab'}
                </span>
            </div>
            {hasContributors && (
                <div className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-white text-xs font-bold">
                    +{contributorCount}
                </div>
            )}
        </div>
    );
};

export default CollaborativeBadge;
