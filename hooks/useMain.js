// useMain.js - FIXED VERSION with smooth pagination and persistent interactions
import { useState, useEffect, useCallback, useRef } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function useMain(initialState = null) {
    // Always use initialState for hydration, never overwrite with client fetch
    const [stories, setStories] = useState(initialState?.stories || []);
    const [loading, setLoading] = useState(false);
    const [hasNext, setHasNext] = useState(initialState?.hasNext ?? true);
    const [isFetching, setIsFetching] = useState(false);
    const [currentTag, setCurrentTag] = useState(initialState?.currentTag || 'for-you');
    const [currentDimension, setCurrentDimension] = useState('feed');
    const [followingUsers, setFollowingUsers] = useState([]);
    const [page, setPage] = useState(initialState?.page || 1);
    const [error, setError] = useState(null);
    const [prefetchedStories, setPrefetchedStories] = useState(null);
    const isPrefetchingRef = useRef(false);

    const { currentUser, isAuthenticated, refreshAuth } = useAuth();

    // Remove client-side fetch on mount; SSR initialState is always used
    // This prevents hydration mismatch and ensures SSR stories are shown
    // If you want to support client navigation to tags, use handleTagSwitch
    
    // Handle tag switching
    const handleTagSwitch = useCallback(async (tag, { force = false } = {}) => {
        if (tag === currentTag && !force) return;

        setLoading(true);
        setPage(1);
        setError(null);
        setPrefetchedStories(null);
        
        try {
            setCurrentTag(tag);

            const params = { page: 1 };
            if (tag !== 'for-you') params.tag = tag;
            if (force) params._t = Date.now();

            const result = await storiesApi.getPaginatedStories(params);
            let fetched = result.results || [];
            
            if (force && tag === 'for-you' && fetched.length > 1) {
                for (let i = fetched.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [fetched[i], fetched[j]] = [fetched[j], fetched[i]];
                }
            }

            setStories(fetched);
            setHasNext(result.next !== null);
            
            // Prefetch next page
            if (result.next !== null && !isPrefetchingRef.current) {
                const nextParams = { page: 2 };
                if (tag !== 'for-you') nextParams.tag = tag;
                if (force) nextParams._t = Date.now();

                isPrefetchingRef.current = true;
                storiesApi.getPaginatedStories(nextParams)
                    .then(nextStories => {
                        let prefetched = nextStories.results || [];
                        if (force && tag === 'for-you' && prefetched.length > 1) {
                            for (let i = prefetched.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [prefetched[i], prefetched[j]] = [prefetched[j], prefetched[i]];
                            }
                        }
                        setPrefetchedStories(prefetched);
                    })
                    .catch(err => {
                    })
                    .finally(() => {
                        isPrefetchingRef.current = false;
                    });
            }
        } catch (error) {
            setError(error.message || 'Failed to load stories');
        } finally {
            setLoading(false);
        }
    }, [currentTag]);
    
    // 🔥 OPTIMIZED: Handle infinite scroll with INSTANT rendering
    const handleFetchMore = useCallback(async () => {
        if (isFetching || !hasNext) return;
        
        setIsFetching(true);
        setError(null);
        
        try {
            const nextPage = page + 1;
            
            // 🔥 KEY FIX: Use prefetched stories IMMEDIATELY
            if (prefetchedStories && prefetchedStories.length > 0) {
                // Remove duplicates
                const existingIds = new Set(stories.map(s => s.id));
                const filteredStories = prefetchedStories.filter(s => !existingIds.has(s.id));
                
                // ✅ ADD STORIES INSTANTLY - no waiting!
                if (filteredStories.length > 0) {
                    setStories(prev => [...prev, ...filteredStories]);
                    setPage(nextPage);
                }
                
                // Clear prefetched cache
                setPrefetchedStories(null);
                
                // Start prefetching NEXT page in background
                if (!isPrefetchingRef.current) {
                    const params = { page: nextPage + 1 };
                    if (currentTag !== 'for-you') params.tag = currentTag;
                    
                    isPrefetchingRef.current = true;
                    storiesApi.getPaginatedStories(params)
                        .then(result => {
                            if (result.results && result.results.length > 0) {
                                setPrefetchedStories(result.results);
                                setHasNext(result.next !== null);
                            } else {
                                setHasNext(false);
                            }
                        })
                        .catch(err => {
                            setHasNext(false);
                        })
                        .finally(() => {
                            isPrefetchingRef.current = false;
                        });
                }
                
                setIsFetching(false);
                return;
            }
            
            // 🔥 FALLBACK: If no prefetched data, fetch now
            const params = { page: nextPage };
            if (currentTag !== 'for-you') params.tag = currentTag;
            
            const result = await storiesApi.getPaginatedStories(params);
            const newStories = result.results || [];
            
            // Remove duplicates
            const existingIds = new Set(stories.map(s => s.id));
            const filteredStories = newStories.filter(s => !existingIds.has(s.id));
            
            if (filteredStories.length > 0) {
                setStories(prev => [...prev, ...filteredStories]);
                setPage(nextPage);
            }
            
            const hasMorePages = result.next !== null && result.next !== undefined;
            setHasNext(hasMorePages);
            
            // Start prefetching next page
            if (hasMorePages && !isPrefetchingRef.current) {
                const nextParams = { page: nextPage + 1 };
                if (currentTag !== 'for-you') nextParams.tag = currentTag;

                isPrefetchingRef.current = true;
                storiesApi.getPaginatedStories(nextParams)
                    .then(nextStories => {
                        if (nextStories.results && nextStories.results.length > 0) {
                            setPrefetchedStories(nextStories.results);
                        }
                    })
                    .catch(err => {
                    })
                    .finally(() => {
                        isPrefetchingRef.current = false;
                    });
            }
        } catch (error) {
            setError(error.message || 'Failed to load more stories');
        } finally {
            setIsFetching(false);
        }
    }, [isFetching, hasNext, page, currentTag, stories, prefetchedStories]);
    
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
    
    return {
        stories,
        loading,
        hasNext,
        isFetching,
        currentTag,
        currentDimension,
        currentUser,
        followingUsers,
        isAuthenticated,
        error,
        handleTagSwitch,
        handleFetchMore,
        handleFollowUser,
        handleOpenStoryVerses,
        refreshAuth
    };
}