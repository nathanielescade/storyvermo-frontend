// useMain.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function useMain(initialState = null) {
    const [stories, setStories] = useState(initialState?.stories || []);
    const [loading, setLoading] = useState(initialState ? false : true);
    const [hasNext, setHasNext] = useState(initialState?.hasNext ?? true);
    const [isFetching, setIsFetching] = useState(false);
    const [currentTag, setCurrentTag] = useState(initialState?.currentTag || 'for-you');
    const [currentDimension, setCurrentDimension] = useState('feed');
    const [followingUsers, setFollowingUsers] = useState([]);
    const [userInteractions, setUserInteractions] = useState({});
    const [page, setPage] = useState(initialState?.page || 1);
    const [error, setError] = useState(null);
    const [prefetchedStories, setPrefetchedStories] = useState(null);
    const isPrefetchingRef = useRef(false);
    
    const { currentUser, isAuthenticated, refreshAuth } = useAuth();
    
    // Initialize the app with stories
    useEffect(() => {
        const initializeApp = async () => {
            // Skip if we have initial state
            if (initialState) return;
            
            try {
                setLoading(true);
                let initialTag = 'for-you';
                
                // Extract tag from URL if present
                if (typeof window !== 'undefined') {
                    const match = window.location.pathname.match(/^\/tags\/([^\/]+)\/?$/);
                    if (match && match[1]) {
                        try {
                            initialTag = decodeURIComponent(match[1]);
                        } catch (e) {
                            initialTag = match[1];
                        }
                    }
                }

                setCurrentTag(initialTag);

                // Build params based on initialTag
                const params = { page: 1 };
                if (initialTag !== 'for-you') params.tag = initialTag;

                // Get initial stories
                const initialStories = await storiesApi.getPaginatedStories(params);
                setStories(initialStories.results || []);
                setHasNext(initialStories.next !== null);
                
                // Prefetch next page immediately for seamless experience
                if (initialStories.next !== null && !isPrefetchingRef.current) {
                    const nextParams = { page: 2 };
                    if (initialTag !== 'for-you') nextParams.tag = initialTag;
                    
                    isPrefetchingRef.current = true;
                    storiesApi.getPaginatedStories(nextParams)
                        .then(nextStories => {
                            setPrefetchedStories(nextStories.results || []);
                        })
                        .catch(err => {
                            console.warn('Failed to prefetch next page', err);
                        })
                        .finally(() => {
                            isPrefetchingRef.current = false;
                        });
                }
            } catch (error) {
                console.error('Error initializing app:', error);
                setError(error.message || 'Failed to load stories');
            } finally {
                setLoading(false);
            }
        };
        
        initializeApp();
    }, [initialState]);
    
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
            
            // Shuffle for-you feed on force refresh
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
                        console.warn('Failed to prefetch next page', err);
                    })
                    .finally(() => {
                        isPrefetchingRef.current = false;
                    });
            }
        } catch (error) {
            console.error('Error switching tag:', error);
            setError(error.message || 'Failed to load stories');
        } finally {
            setLoading(false);
        }
    }, [currentTag]);
    
    // Handle infinite scroll with prefetching
    const handleFetchMore = useCallback(async () => {
        if (isFetching || !hasNext) return;
        
        setIsFetching(true);
        setError(null);
        
        try {
            const nextPage = page + 1;
            const params = { page: nextPage };
            if (currentTag !== 'for-you') params.tag = currentTag;
            
            let result;
            let newStories;
            
            // Use prefetched stories if available
            if (prefetchedStories && prefetchedStories.length > 0) {
                newStories = prefetchedStories;
                setPrefetchedStories(null);
                
                try {
                    result = await storiesApi.getPaginatedStories(params);
                } catch (err) {
                    console.warn('Failed to get pagination info:', err);
                    result = { next: true };
                }
            } else {
                result = await storiesApi.getPaginatedStories(params);
                newStories = result.results || [];
            }
            
            // Remove duplicates before adding new stories
            const existingIds = new Set(stories.map(s => s.id));
            const filteredStories = newStories.filter(s => !existingIds.has(s.id));
            
            if (filteredStories.length > 0) {
                setStories(prev => [...prev, ...filteredStories]);
                setPage(nextPage);
            }
            
            // Determine if there are more pages
            const hasMorePages = result.next !== null && result.next !== undefined;
            setHasNext(hasMorePages);
            
            // Prefetch next page if available
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
                        console.warn('Failed to prefetch next page', err);
                    })
                    .finally(() => {
                        isPrefetchingRef.current = false;
                    });
            }
        } catch (error) {
            console.error('Error fetching more stories:', error);
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
            console.error('Error following user:', error);
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
    
    // Handle like toggle
    const handleLikeToggle = useCallback(async (storyId) => {
        try {
            const response = await storiesApi.toggleStoryLike(storyId);
            
            setStories(prev => prev.map(story => {
                if (story.id === storyId) {
                    return {
                        ...story,
                        likes_count: response.likes_count,
                        is_liked_by_user: response.is_liked_by_user
                    };
                }
                return story;
            }));
            
            return response;
        } catch (error) {
            console.error('Error toggling like:', error);
            return { success: false, message: 'Failed to toggle like' };
        }
    }, []);
    
    // Handle save toggle
    const handleSaveToggle = useCallback(async (storyId) => {
        try {
            const response = await storiesApi.toggleStorySave(storyId);
            
            setStories(prev => prev.map(story => {
                if (story.id === storyId) {
                    return {
                        ...story,
                        saves_count: response.saves_count,
                        is_saved_by_user: response.is_saved_by_user
                    };
                }
                return story;
            }));
            
            return response;
        } catch (error) {
            console.error('Error toggling save:', error);
            return { success: false, message: 'Failed to toggle save' };
        }
    }, []);
    
    return {
        stories,
        loading,
        hasNext,
        isFetching,
        currentTag,
        currentDimension,
        currentUser,
        followingUsers,
        userInteractions,
        isAuthenticated,
        error,
        handleTagSwitch,
        handleFetchMore,
        handleFollowUser,
        handleOpenStoryVerses,
        handleLikeToggle,
        handleSaveToggle,
        refreshAuth
    };
}