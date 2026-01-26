// StoryCardSkeleton.js - Server Component (NO JS, NO EFFECTS, NO MODALS)
// Pure presentation: image + title + tags. That's it.
// This renders server-side and loads INSTANTLY

import Image from 'next/image';
import { absoluteUrl } from '../../../../lib/api';

export default function StoryCardSkeleton({ story, index, viewType = 'feed' }) {
    if (!story) return null;

    const getCoverImageUrl = () => {
        if (!story) return null;
        const cov = story.cover_image;
        if (!cov) return null;
        
        if (typeof cov === 'string') {
            return cov ? absoluteUrl(cov) : null;
        }
        
        const url = cov.file_url || cov.url || '';
        return url ? absoluteUrl(url) : null;
    };

    const getTagName = (tag) => {
        if (typeof tag === 'string') return tag;
        return tag.name || tag.slug || tag.id || 'tag';
    };

    const getTagId = (tag) => {
        if (typeof tag === 'string') return tag;
        return tag.id || tag.slug || tag.name;
    };

    const getCreatorInitial = () => {
        let name = '';
        
        if (story.creator_account_type === 'brand' && story.creator_brand_name) {
            name = story.creator_brand_name;
        } else if (story.creator_full_name) {
            name = story.creator_full_name;
        } else if (story.creator_first_name || story.creator_last_name) {
            name = `${story.creator_first_name || ''}${story.creator_first_name && story.creator_last_name ? ' ' : ''}${story.creator_last_name || ''}`.trim();
        } else if (typeof story.creator === 'string') {
            name = story.creator;
        } else if (typeof story.creator === 'object' && story.creator) {
            if (story.creator.first_name || story.creator.last_name) {
                name = `${story.creator.first_name || ''}${story.creator.first_name && story.creator.last_name ? ' ' : ''}${story.creator.last_name || ''}`.trim();
            } else if (story.creator.name) {
                name = story.creator.name;
            } else if (story.creator.username) {
                name = story.creator.username;
            }
        } else if (story.creator_username) {
            name = story.creator_username;
        }
        
        return name.charAt(0).toUpperCase() || '?';
    };

    if (viewType === 'feed') {
        const coverImageUrl = getCoverImageUrl();
        const creatorUsername = story.creator_username || 
            (typeof story.creator === 'string' ? story.creator : '') ||
            (typeof story.creator === 'object' && story.creator?.username ? story.creator.username : 'anonymous');

        return (
            <div 
                className="scene-card-skeleton"
                data-story-id={story.id}
                data-creator={creatorUsername}
                data-story-slug={story.slug || ''}
            >
                {/* IMAGE - Priority load with fetchpriority for LCP optimization */}
                {coverImageUrl ? (
                    <div className="relative w-full h-full">
                        {index === 0 ? (
                            <Image
                                src={coverImageUrl}
                                alt={story.title || 'Story cover'}
                                fill
                                priority
                                fetchPriority="high"
                                quality={50}
                                loading="eager"
                                className="scene-bg w-full h-full"
                                // sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                            />
                        ) : (
                            <Image
                                src={coverImageUrl}
                                alt={story.title || 'Story cover'}
                                fill
                                quality={60}
                                className="scene-bg w-full h-full"
                                // sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                            />
                        )}
                    </div>
                ) : (
                    <div className="scene-bg-placeholder bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <div className="text-slate-600 text-4xl">
                            <i className="fas fa-image"></i>
                        </div>
                    </div>
                )}

                <div className="scene-overlay"></div>

                {/* MINIMAL SKELETON: Title + Tags only (NO interactive elements) */}
                <div 
                    className="skeleton-overlay absolute bottom-36 left-[5%] right-[5%] bg-black/60 backdrop-blur-[0.5px] border-2 border-[rgba(80,105,219,0.4)] rounded-2xl p-3 overflow-visible"
                    style={{
                        position: 'absolute',
                        transform: 'translateZ(0)',
                        pointerEvents: 'none' // Don't interact with skeleton
                    }}
                >
                    {/* Title - LARGER for better LCP (should be LCP element, not client version) */}
                    <div className="mb-3">
                        <h2 className="text-white text-2xl md:text-3xl font-bold line-clamp-2">
                            {story.title || 'Untitled Story'}
                        </h2>
                    </div>

                    {/* Tags - Static display only */}
                    {Array.isArray(story.tags) && story.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {story.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="text-xs bg-slate-700/80 text-slate-200 px-2 py-1 rounded-full"
                                >
                                    {getTagName(tag)}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Creator chip - Static only (NO follow button) */}
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-shrink-0">
                            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                {getCreatorInitial()}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-300">
                                @{creatorUsername}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (viewType === 'grid') {
        const imageUrl = story.cover_image ? absoluteUrl(
            typeof story.cover_image === 'string' 
                ? story.cover_image 
                : (story.cover_image.file_url || story.cover_image.url || '')
        ) : null;

        return (
            <div className="verse-card">
                {imageUrl ? (
                    <Image 
                        src={imageUrl}
                        alt={story.title || 'Untitled Story'}
                        fill
                        quality={75}
                        className="w-full h-full object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="verse-card-placeholder bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <div className="text-slate-600 text-4xl">
                            <i className="fas fa-image"></i>
                        </div>
                    </div>
                )}
                <div className="verse-card-overlay">
                    <div className="verse-card-user">
                        <div className="verse-card-avatar">{getCreatorInitial()}</div>
                        <div className="verse-card-username">@{story.creator_username || 'unknown'}</div>
                    </div>
                    <div className="verse-card-title">{story.title || 'Untitled Story'}</div>
                    <div className="verse-card-verses">
                        <i className="fas fa-book-open text-white"></i>
                        <span className="verse-card-count">{Array.isArray(story.verses) ? story.verses.length : 0}</span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
