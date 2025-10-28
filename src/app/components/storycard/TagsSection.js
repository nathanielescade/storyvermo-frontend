import React from 'react';

const TagsSection = ({ 
    story, 
    currentTag, 
    onTagSelect, 
    getTagName, 
    getTagId 
}) => {

    // Normalize to a slug form used in URLs for comparison.
    const toSlug = (v) => {
        if (v == null) return '';
        try {
            return String(v).toLowerCase().trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '')
                .replace(/-+/g, '-');
        } catch (e) {
            return String(v);
        }
    };

    const currentTagSlug = toSlug(currentTag);
    return (
        <div className="scene-tags-container">
            <div className="scene-tags">
                {story.tags && Array.isArray(story.tags) && story.tags.map(tag => {
                    const tagName = getTagName(tag);
                    const tagId = getTagId(tag);
                    const tagSlug = toSlug(tagName);
                    // Compare normalized slugs so URL-driven selection matches UI
                    const isActive = currentTagSlug && currentTagSlug === tagSlug;
                    
                    return (
                        <a 
                            key={tagId} 
                            href={`/tags/${encodeURIComponent(tagSlug)}/`} 
                            data-tag={tagName} 
                            className={`scene-tag py-1 px-2.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                                isActive
                                    ? 'bg-gradient-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100' 
                                    : 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/40'
                            }`}
                            onClick={(e) => {
                                e.preventDefault();
                                if (onTagSelect) {
                                    onTagSelect(tagName);
                                }
                            }}
                        >
                            {tagName}
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default TagsSection; 