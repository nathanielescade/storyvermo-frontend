// useMain.js - 🚀 CURSOR-BASED INFINITE SCROLL with proper pagination
import { useState, useEffect, useCallback, useRef } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { stripVerseImages } from '../lib/utils';

export default function useMain(initialState = null) {
    // Load saved feed state from sessionStorage to restore position when returning
    const getSavedFeedState = () => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = sessionStorage.getItem('feedState');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    };

    const savedState = getSavedFeedState();

    // Always use initialState for hydration, never overwrite with client fetch
    const [stories, setStories] = useState(savedState?.stories || initialState?.stories || []);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [currentTag, setCurrentTag] = useState(savedState?.currentTag || initialState?.currentTag || 'for-you');
    const [currentDimension, setCurrentDimension] = useState('feed');
    const [followingUsers, setFollowingUsers] = useState([]);
    const [error, setError] = useState(null);
    
    // CURSOR-BASED PAGINATION STATE
    const [nextCursor, setNextCursor] = useState(savedState?.nextCursor || initialState?.nextCursor || null);
    const [hasMore, setHasMore] = useState(savedState?.hasMore !== false && initialState?.hasMore !== false);
    const [totalCount, setTotalCount] = useState(savedState?.totalCount || initialState?.totalCount || 0);
    
    // Prefetch management
    const [prefetchedStories, setPrefetchedStories] = useState(null);
    const [prefetchedCursor, setPrefetchedCursor] = useState(null);
    const isPrefetchingRef = useRef(false);
    const lastFetchTagRef = useRef(initialState?.currentTag || 'for-you');

    const { currentUser, isAuthenticated, refreshAuth } = useAuth();
    
    // Prefetch next page in background (defined before handleTagSwitch)
    const prefetchNextPageInner = useCallback(async (cursor, tag) => {
        if (isPrefetchingRef.current || !cursor) return;
        
        try {
            isPrefetchingRef.current = true;
            const params = { 
                cursor,
                limit: 5
            };

            // Special-case: if requesting the 'untagged' tag, do not pass a tag
            // to the API (server likely doesn't support an 'untagged' filter).
            // We'll filter client-side for stories that have no tags.
            const tagSlug = String(tag || '').toLowerCase().replace(/\s+/g,'-');
            const isUntagged = tagSlug === 'untagged';
            if (!isUntagged && tag) params.tag = tag;
            
            const result = await storiesApi.getPaginatedStories(params);
            let prefetched = result.results || [];

            // If we're loading the 'uncategorized' view, filter to stories with no tags
            if (isUntagged) {
                prefetched = prefetched.filter(s => {
                    if (Array.isArray(s.tags)) return s.tags.length === 0;
                    if (typeof s.tags_count === 'number') return s.tags_count === 0;
                    return false;
                });
            }
            
            // 🎯 OPTIMIZATION: Strip verse images from prefetched stories
            prefetched = stripVerseImages(prefetched);
            
            setPrefetchedStories(prefetched);
            setPrefetchedCursor(result.next_cursor || null);
        } catch (err) {
            // Silently fail - not critical
        } finally {
            isPrefetchingRef.current = false;
        }
    }, []);
    
    // Handle tag switching - reset to first page
    const handleTagSwitch = useCallback(async (tag, { force = false } = {}) => {
        if (tag === currentTag && !force) return;

        setLoading(true);
        setError(null);
        setPrefetchedStories(null);
        setPrefetchedCursor(null);
        
        try {
            setCurrentTag(tag);
            lastFetchTagRef.current = tag;

            const tagSlug = String(tag || '').toLowerCase().replace(/\s+/g,'-');
            const isUntagged = tagSlug === 'untagged';

            const params = { 
                cursor: null, // Reset cursor for new tag
                limit: 5
            };
            if (!isUntagged && tag) params.tag = tag;
            if (force) params._t = Date.now();

            const result = await storiesApi.getPaginatedStories(params);
            let fetched = result.results || [];
            
            // 🚀 OPTIMIZATION: Only enrich stories that are missing tag data
            // This ensures instant display by using lightweight data when available
            const needsEnrichment = fetched.some(story => 
              !Array.isArray(story.tags) && story.tags_count === undefined
            );
            
            if (needsEnrichment) {
                try {
                    fetched = await Promise.all(
                        fetched.map(async (story) => {
                            // Only enrich if missing tags
                            if (!Array.isArray(story.tags) && story.tags_count === undefined) {
                                try {
                                    const fullStory = await storiesApi.getStoryBySlug(story.slug);
                                    return fullStory;
                                } catch (error) {
                                    return story;
                                }
                            }
                            return story;
                        })
                    );
                } catch (e) {
                    // If Promise.all fails, just use lightweight stories
                }
            }
            
            // Shuffle for-you feed for variety
            if (force && tag === 'for-you' && fetched.length > 1) {
                for (let i = fetched.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [fetched[i], fetched[j]] = [fetched[j], fetched[i]];
                }
            }

            // 🎯 OPTIMIZATION: Strip verse images to reduce payload and improve performance
            // Images will be lazy-loaded when user opens VerseViewer
            fetched = stripVerseImages(fetched);

            // If we're showing the 'uncategorized' tag, filter fetched results to stories with no tags.
            if (isUntagged) {
                const MIN_UNTAGGED_TO_SHOW = 6; // try to accumulate this many untagged stories

                const filterUntagged = (list) => list.filter(s => {
                    if (Array.isArray(s.tags)) return s.tags.length === 0;
                    if (typeof s.tags_count === 'number') return s.tags_count === 0;
                    return false;
                });

                let untagged = filterUntagged(fetched);

                // If we didn't gather enough untagged stories from the first page, fetch additional pages
                // (bounded attempts) and accumulate until we have a decent batch to display.
                if ((untagged.length < MIN_UNTAGGED_TO_SHOW) && result.next_cursor) {
                    let accum = [...untagged];
                    let cursor = result.next_cursor;
                    let attempts = 0;
                    const MAX_ATTEMPTS = 6;

                    while ((accum.length < MIN_UNTAGGED_TO_SHOW) && cursor && attempts < MAX_ATTEMPTS) {
                        try {
                            const nextParams = { cursor, limit: 8 };
                            const nextResult = await storiesApi.getPaginatedStories(nextParams);
                            let page = nextResult.results || [];

                            // Enrich page if needed (same logic as above)
                            const pageNeedsEnrichment = page.some(story => !Array.isArray(story.tags) && story.tags_count === undefined);
                            if (pageNeedsEnrichment) {
                                try {
                                    page = await Promise.all(
                                        page.map(async (story) => {
                                            if (!Array.isArray(story.tags) && story.tags_count === undefined) {
                                                try {
                                                    const fullStory = await storiesApi.getStoryBySlug(story.slug);
                                                    return fullStory;
                                                } catch (e) {
                                                    return story;
                                                }
                                            }
                                            return story;
                                        })
                                    );
                                } catch (e) {
                                    // ignore enrichment failures
                                }
                            }

                            page = stripVerseImages(page);

                            const filteredPage = filterUntagged(page);
                            if (filteredPage.length > 0) {
                                // Append new unique stories
                                const existingIds = new Set(accum.map(s => s.id));
                                filteredPage.forEach(s => {
                                    if (!existingIds.has(s.id)) accum.push(s);
                                });
                                // update next cursor to continue pagination from here
                                result.next_cursor = nextResult.next_cursor || null;
                            }

                            cursor = nextResult.next_cursor || null;
                            attempts += 1;
                        } catch (e) {
                            break; // stop trying on error
                        }
                    }

                    if (accum.length > 0) {
                        untagged = accum;
                    }
                }

                fetched = untagged;
            }

            setStories(fetched);
            setNextCursor(result.next_cursor || null);
            setHasMore(result.has_more !== false);
            setTotalCount(result.count || 0);
            
            // Prefetch next page automatically
            if (result.next_cursor && !isPrefetchingRef.current) {
                prefetchNextPageInner(result.next_cursor, tag);
            }
        } catch (error) {
            setError(error.message || 'Failed to load stories');
            setStories([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [currentTag, prefetchNextPageInner]);

    // 🚀 Initialize feed with data when no initialState is provided (e.g., homepage without SSR)
    useEffect(() => {
        if (initialState === null && stories.length === 0 && !loading) {
            // Trigger initial fetch for the current tag
            handleTagSwitch(currentTag, { force: true });
        }
    }, []); // Only run once on mount

    // 💾 Save feed state to sessionStorage for restoration when returning
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const feedState = {
                stories,
                currentTag,
                nextCursor,
                hasMore,
                totalCount
            };
            sessionStorage.setItem('feedState', JSON.stringify(feedState));
        } catch (e) {
            // Silently fail if sessionStorage is unavailable
        }
    }, [stories, currentTag, nextCursor, hasMore, totalCount]);

    // Prefetch next page in background
    const prefetchNextPage = useCallback(async (cursor, tag) => {
        if (isPrefetchingRef.current || !cursor) return;
        
        try {
            isPrefetchingRef.current = true;
            const tagSlug = String(tag || '').toLowerCase().replace(/\s+/g,'-');
            const isUntagged = tagSlug === 'uncategorized';

            const params = { 
                cursor,
                limit: 5
            };
            if (!isUntagged && tag) params.tag = tag;

            const result = await storiesApi.getPaginatedStories(params);
            let prefetched = result.results || [];
            
                        // 🚀 OPTIMIZATION: Only enrich prefetched stories that are missing tag data
            const needsEnrichment = prefetched.some(story => 
              !Array.isArray(story.tags) && story.tags_count === undefined
            );
            
            if (needsEnrichment) {
                try {
                    prefetched = await Promise.all(
                        prefetched.map(async (story) => {
                            if (!Array.isArray(story.tags) && story.tags_count === undefined) {
                                try {
                                    const fullStory = await storiesApi.getStoryBySlug(story.slug);
                                    return fullStory;
                                } catch (error) {
                                    return story;
                                }
                            }
                            return story;
                        })
                    );
                } catch (e) {
                    // If enrichment fails, use lightweight stories
                }
            }
            
            // If we're loading the 'uncategorized' view, filter to stories with no tags
            if (isUntagged) {
                prefetched = prefetched.filter(s => {
                    if (Array.isArray(s.tags)) return s.tags.length === 0;
                    if (typeof s.tags_count === 'number') return s.tags_count === 0;
                    return false;
                });
            }

            // 🎯 OPTIMIZATION: Strip verse images from prefetched stories
            prefetched = stripVerseImages(prefetched);
            
            setPrefetchedStories(prefetched);
            setPrefetchedCursor(result.next_cursor || null);
        } catch (err) {
            // Silently fail - not critical
        } finally {
            isPrefetchingRef.current = false;
        }
    }, []);
    
    // 🚀 INFINITE SCROLL: Load next page with cursor
    const handleFetchMore = useCallback(async () => {
        if (isFetching || !hasMore || !nextCursor) return;
        
        setIsFetching(true);
        setError(null);
        
        try {
            // 🔥 KEY OPTIMIZATION: Use prefetched stories IMMEDIATELY
            if (prefetchedStories && prefetchedStories.length > 0) {
                // Remove duplicates
                const existingIds = new Set(stories.map(s => s.id));
                const filteredStories = prefetchedStories.filter(s => !existingIds.has(s.id));
                
                // ✅ INSTANT APPEND - no waiting!
                if (filteredStories.length > 0) {
                    setStories(prev => [...prev, ...filteredStories]);
                }
                
                // Update cursor and prefetch state
                setNextCursor(prefetchedCursor);
                setHasMore(prefetchedCursor !== null);
                setPrefetchedStories(null);
                setPrefetchedCursor(null);
                
                // Start prefetching NEXT page in background
                if (prefetchedCursor && !isPrefetchingRef.current) {
                    prefetchNextPage(prefetchedCursor, lastFetchTagRef.current);
                }
                
                setIsFetching(false);
                return;
            }
            
            // 🔥 FALLBACK: If no prefetched data, fetch now (shouldn't happen often)
            const tagSlug = String(currentTag || '').toLowerCase().replace(/\s+/g,'-');
            const isUntagged = tagSlug === 'uncategorized';

            const params = { 
                cursor: nextCursor,
                limit: 5
            };
            if (!isUntagged && currentTag) params.tag = currentTag;

            const result = await storiesApi.getPaginatedStories(params);
            let newStories = result.results || [];
            
            // 🚀 OPTIMIZATION: Only enrich newly fetched stories that are missing tag data
            const needsEnrichment = newStories.some(story => 
              !Array.isArray(story.tags) && story.tags_count === undefined
            );
            
            if (needsEnrichment) {
                try {
                    newStories = await Promise.all(
                        newStories.map(async (story) => {
                            if (!Array.isArray(story.tags) && story.tags_count === undefined) {
                                try {
                                    const fullStory = await storiesApi.getStoryBySlug(story.slug);
                                    return fullStory;
                                } catch (error) {
                                    return story;
                                }
                            }
                            return story;
                        })
                    );
                } catch (e) {
                    // If enrichment fails, use lightweight stories
                }
            }
            
            // If we're loading the 'uncategorized' tag, filter to stories with no tags
            if (isUntagged) {
                newStories = newStories.filter(s => {
                    if (Array.isArray(s.tags)) return s.tags.length === 0;
                    if (typeof s.tags_count === 'number') return s.tags_count === 0;
                    return false;
                });
            }

            // 🎯 OPTIMIZATION: Strip verse images from newly fetched stories
            newStories = stripVerseImages(newStories);
            
            // Remove duplicates
            const existingIds = new Set(stories.map(s => s.id));
            const filteredStories = newStories.filter(s => !existingIds.has(s.id));
            
            if (filteredStories.length > 0) {
                setStories(prev => [...prev, ...filteredStories]);
            }
            
            // Update pagination state
            setNextCursor(result.next_cursor || null);
            setHasMore(result.has_more !== false);
            
            // Prefetch next page
            if (result.next_cursor && !isPrefetchingRef.current) {
                prefetchNextPage(result.next_cursor, lastFetchTagRef.current);
            }
        } catch (error) {
            setError(error.message || 'Failed to load more stories');
        } finally {
            setIsFetching(false);
        }
    }, [isFetching, hasMore, nextCursor, stories, prefetchedStories, prefetchedCursor, currentTag, prefetchNextPage]);
    
    // Handle follow user
    const handleFollowUser = useCallback(async (username) => {
        try {
            const response = await userApi.followUser(username);
            
            if (response.success) {
                setFollowingUsers(prev => 
                    response.following 
                        ? [...prev, username] 
                        : prev.filter(user => user !== username)
                );
                
                setStories(prev => prev.map(story => {
                    if (story.creator === username) {
                        return {
                            ...story,
                            isFollowing: response.following
                        };
                    }
                    return story;
                }));
            }
            
            return response;
        } catch (error) {
            return { success: false, message: 'Failed to follow user' };
        }
    }, []);
    
    // Handle open story verses
    const handleOpenStoryVerses = useCallback((storyId) => {
        const story = stories.find(s => s.id === storyId);
        if (story) {
            window.location.href = `/stories/${story.slug}/verses/`;
        }
    }, [stories]);

    // Refresh current stories WITHOUT full page reload - called after login
    const refreshStories = useCallback(async () => {
        if (stories.length === 0) return;
        
        try {
            const params = { 
                cursor: null,
                limit: 5,
                tag: currentTag 
            };
            
            const result = await storiesApi.getPaginatedStories(params);
            let freshStories = result.results || [];
            
            // 🚀 CRITICAL: Enrich refreshed stories with full data (tags, verses_count, etc)
            try {
                freshStories = await Promise.all(
                    freshStories.map(async (story) => {
                        try {
                            const fullStory = await storiesApi.getStoryBySlug(story.slug);
                            return fullStory;
                        } catch (error) {
                            return story;
                        }
                    })
                );
            } catch (e) {
                // If enrichment fails, use lightweight stories
            }
            
            if (freshStories.length > 0) {
                // 🎯 OPTIMIZATION: Strip verse images from refreshed stories
                freshStories = stripVerseImages(freshStories);
                
                setStories(freshStories);
                setNextCursor(result.next_cursor || null);
                setHasMore(result.has_more !== false);
                setTotalCount(result.count || 0);
            }
        } catch (error) {
            // Silently fail
        }
    }, [currentTag, stories.length]);
    
    // Backward compatibility: prefetchNext method (called from FeedClient)
    const prefetchNext = useCallback(() => {
        if (nextCursor && !isPrefetchingRef.current) {
            prefetchNextPage(nextCursor, lastFetchTagRef.current);
        }
    }, [nextCursor, prefetchNextPage]);
    
    return {
        stories,
        loading,
        hasMore,
        isFetching,
        currentTag,
        currentDimension,
        currentUser,
        followingUsers,
        isAuthenticated,
        error,
        nextCursor,
        totalCount,
        handleTagSwitch,
        handleFetchMore,
        handleFollowUser,
        handleOpenStoryVerses,
        refreshStories,
        refreshAuth,
        prefetchNext,
    };
}