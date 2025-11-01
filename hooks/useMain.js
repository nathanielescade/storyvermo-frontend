// useMain.js
import { useState, useEffect, useCallback } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const CACHE_KEY = 'home:state:v1';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
// Use the full cache TTL as the default refresh threshold so the UI will
// preserve the exact feed state while the cache is considered fresh.
const REFRESH_THRESHOLD = CACHE_TTL;

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
    
    // Use the AuthContext instead of local auth state
    const { currentUser, isAuthenticated, refreshAuth } = useAuth();
    
    // Initialize the app (check for /tags/:tag in URL and load accordingly)
    useEffect(() => {
        const initializeApp = async () => {
            // If server supplied an initialState, skip client-side initialization
            // to avoid immediately re-fetching and overwriting server-rendered data.
            if (initialState) return;
            let restoredFromCache = false;
            let restoredAge = Infinity;
            // Try to restore state from history.state (preferred) or sessionStorage
            // so that browser back/forward restores exact UI without a reload.
            try {
                if (typeof window !== 'undefined') {
                    // 1) history.state (best for back/forward)
                    const hist = window.history && window.history.state && window.history.state.homeState;
                    if (hist) {
                        const age = Date.now() - (hist.ts || 0);
                        if (age < CACHE_TTL && Array.isArray(hist.stories) && hist.stories.length > 0) {
                            setStories(hist.stories);
                            setCurrentTag(hist.currentTag || 'for-you');
                            setPage(hist.page || 1);
                            setHasNext(hist.hasNext !== undefined ? hist.hasNext : true);
                            setLoading(false);
                            restoredFromCache = true;
                            restoredAge = age;
                        }
                    }

                    // 2) fallback: sessionStorage
                    if (!restoredFromCache) {
                        const raw = sessionStorage.getItem(CACHE_KEY);
                        if (raw) {
                            try {
                                const parsed = JSON.parse(raw);
                                const age = Date.now() - (parsed.ts || 0);
                                if (parsed && age < CACHE_TTL) {
                                    if (Array.isArray(parsed.stories) && parsed.stories.length > 0) {
                                        setStories(parsed.stories);
                                        setCurrentTag(parsed.currentTag || 'for-you');
                                        setPage(parsed.page || 1);
                                        setHasNext(parsed.hasNext !== undefined ? parsed.hasNext : true);
                                        setLoading(false);
                                        restoredFromCache = true;
                                        restoredAge = age;
                                    }
                                } else {
                                    sessionStorage.removeItem(CACHE_KEY);
                                }
                            } catch (e) {
                                sessionStorage.removeItem(CACHE_KEY);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to read home cache', e);
            }

            // If we restored from cache and the cache is fresh enough, skip
            // the backend fetch entirely so the user sees exactly where they
            // left off without any reload. Otherwise continue normal fetch.
            if (restoredFromCache && restoredAge < REFRESH_THRESHOLD) {
                // Already restored and fresh -> skip network fetch
                return;
            }

            // Continue with normal initialization (may overwrite restored data
            // if backend returns fresh data). This ensures consistency.
            
            try {
                // Only show loading indicator if we didn't restore state from cache
                if (!restoredFromCache) setLoading(true);
                // Detect initial tag from the pathname (seo-friendly /tags/<slug>/)
                let initialTag = 'for-you';
                if (typeof window !== 'undefined') {
                    const m = window.location.pathname.match(/^\/tags\/([^\/]+)\/?$/);
                    if (m && m[1]) {
                        try {
                            initialTag = decodeURIComponent(m[1]);
                        } catch (e) {
                            initialTag = m[1];
                        }
                    }
                }

                // Set the current tag so UI reflects selection while fetching
                setCurrentTag(initialTag);

                // Build params based on initialTag
                // If the initial tag is 'for-you', prefer the personalized feed
                if (initialTag === 'for-you') {
                    try {
                        const personalized = await storiesApi.getPersonalizedFeed();
                        // API may return an array or a paginated object
                        if (Array.isArray(personalized)) {
                            setStories(personalized);
                            setHasNext(false);
                        } else if (personalized && Array.isArray(personalized.results)) {
                            setStories(personalized.results);
                            setHasNext(personalized.next !== null);
                        } else if (personalized) {
                            // Unexpected shape - attempt to use it directly
                            setStories(personalized);
                            setHasNext(false);
                        } else {
                            // Fallback to paginated stories
                            const params = { page: 1 };
                            const initialStories = await storiesApi.getPaginatedStories(params);
                            setStories(initialStories.results || []);
                            setHasNext(initialStories.next !== null);
                        }
                    } catch (err) {
                        console.warn('personalized feed failed, falling back to paginated stories', err);
                        const params = { page: 1 };
                        const initialStories = await storiesApi.getPaginatedStories(params);
                        setStories(initialStories.results || []);
                        setHasNext(initialStories.next !== null);
                    }
                } else {
                    const params = { page: 1 };
                    if (initialTag !== 'for-you') params.tag = initialTag;

                    // Get initial stories
                    const initialStories = await storiesApi.getPaginatedStories(params);
                    setStories(initialStories.results || []);
                    setHasNext(initialStories.next !== null);
                }
            } catch (error) {
                console.error('Error initializing app:', error);
            } finally {
                setLoading(false);
            }
        };
        
            initializeApp();
        }, [initialState]);

    // Persist minimal home state so that navigating away and back can restore
    // the feed quickly (stories list, current tag, page, hasNext). Persisting
    // is lightweight and kept for a short TTL.
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const payload = {
                    ts: Date.now(),
                    stories: stories || [],
                    currentTag,
                    page,
                    hasNext
                };
                try {
                    // write to both sessionStorage and history.state so browser
                    // back/forward restores immediately
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
                    try {
                        const nextHist = { ...(window.history && window.history.state), homeState: payload };
                        window.history.replaceState(nextHist, '');
                    } catch (e) {
                        // ignore history errors
                    }
                } catch (e) {
                    // ignore quota errors
                }
            }
        } catch (e) {
            // ignore
        }
    }, [stories, currentTag, page, hasNext]);
    
    // Handle tag switching
    // Handle tag switching. If `force` is true, re-fetch even if tag === currentTag.
    const handleTagSwitch = useCallback(async (tag, { force = false } = {}) => {
        if (tag === currentTag && !force) return;

        setLoading(true);
        setPage(1);
        try {
            setCurrentTag(tag);

            // When switching to 'for-you' prefer the personalized endpoint.
            if (tag === 'for-you') {
                try {
                    const personalized = await storiesApi.getPersonalizedFeed();
                    if (Array.isArray(personalized)) {
                        setStories(personalized);
                        setHasNext(false);
                    } else if (personalized && Array.isArray(personalized.results)) {
                        setStories(personalized.results);
                        setHasNext(personalized.next !== null);
                    } else if (personalized) {
                        setStories(personalized);
                        setHasNext(false);
                    } else {
                        // fallback
                        const params = { page: 1 };
                        const result = await storiesApi.getPaginatedStories(params);
                        setStories(result.results || []);
                        setHasNext(result.next !== null);
                    }
                } catch (err) {
                    console.warn('personalized fetch failed on tag switch; falling back', err);
                    const params = { page: 1 };
                    const result = await storiesApi.getPaginatedStories(params);
                    setStories(result.results || []);
                    setHasNext(result.next !== null);
                }
            } else {
                const params = { page: 1 };
                if (tag !== 'for-you') params.tag = tag;

                const result = await storiesApi.getPaginatedStories(params);
                setStories(result.results || []);
                setHasNext(result.next !== null);
            }
        } catch (error) {
            console.error('Error switching tag:', error);
        } finally {
            setLoading(false);
        }
    }, [currentTag]);
    
    // Handle infinite scroll
    const handleFetchMore = useCallback(async () => {
        // Do not paginate the personalized 'for-you' feed (no infinite scroll)
        if (currentTag === 'for-you') return;
        if (isFetching || !hasNext) return;
        
        setIsFetching(true);
        try {
            const nextPage = page + 1;
            const params = { page: nextPage };
            if (currentTag !== 'for-you') params.tag = currentTag;
            
            const result = await storiesApi.getPaginatedStories(params);
            if (result.results && result.results.length > 0) {
                setStories(prev => [...prev, ...result.results]);
                setPage(nextPage);
            }
            setHasNext(result.next !== null);
        } catch (error) {
            console.error('Error fetching more stories:', error);
        } finally {
            setIsFetching(false);
        }
    }, [isFetching, hasNext, page, currentTag]);
    
    // Handle follow user
    const handleFollowUser = useCallback(async (username) => {
        try {
            const response = await userApi.followUser(username);
            
            // Update the following state
            if (response.success) {
                setFollowingUsers(prev => 
                    response.following 
                        ? [...prev, username] 
                        : prev.filter(user => user !== username)
                );
                
                // Update stories to reflect the follow state
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
    const handleOpenStoryVerses = useCallback((storyId, fromGrid = false, bySwipe = false) => {
        // Navigate to story verses page
        const story = stories.find(s => s.id === storyId);
        if (story) {
            window.location.href = `/stories/${story.slug}/verses/`;
        }
    }, [stories]);
    
    // Handle like toggle
    const handleLikeToggle = useCallback(async (storyId) => {
        try {
            const response = await storiesApi.toggleStoryLike(storyId);
            
            // Update the story in the local state
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
            
            // Update the story in the local state
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
        handleTagSwitch,
        handleFetchMore,
        handleFollowUser,
        handleOpenStoryVerses,
        handleLikeToggle,
        handleSaveToggle,
        refreshAuth
    };
}