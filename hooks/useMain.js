// useMain.js - 🚀 CURSOR-BASED INFINITE SCROLL with proper pagination
import { useState, useEffect, useCallback, useRef } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function useMain(initialState = null) {
    // Always use initialState for hydration, never overwrite with client fetch
    const [stories, setStories] = useState(initialState?.stories || []);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [currentTag, setCurrentTag] = useState(initialState?.currentTag || 'for-you');
    const [currentDimension, setCurrentDimension] = useState('feed');
    const [followingUsers, setFollowingUsers] = useState([]);
    const [error, setError] = useState(null);
    
    // CURSOR-BASED PAGINATION STATE
    const [nextCursor, setNextCursor] = useState(initialState?.nextCursor || null);
    const [hasMore, setHasMore] = useState(initialState?.hasMore !== false);
    const [totalCount, setTotalCount] = useState(initialState?.totalCount || 0);
    
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
                limit: 5,
                tag
            };
            
            const result = await storiesApi.getPaginatedStories(params);
            const prefetched = result.results || [];
            
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

            const params = { 
                cursor: null, // Reset cursor for new tag
                limit: 5,
                tag: tag
            };
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
    // Prefetch next page in background
    const prefetchNextPage = useCallback(async (cursor, tag) => {
        if (isPrefetchingRef.current || !cursor) return;
        
        try {
            isPrefetchingRef.current = true;
            const params = { 
                cursor,
                limit: 5,
                tag
            };
            
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
            const params = { 
                cursor: nextCursor,
                limit: 5,
                tag: currentTag
            };
            
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