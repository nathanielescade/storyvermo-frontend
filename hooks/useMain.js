// useMain.js
import { useState, useEffect, useCallback } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const CACHE_KEY = 'home:state:v1';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
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
    
    const { currentUser, isAuthenticated, refreshAuth } = useAuth();
    
    // Initialize the app
    useEffect(() => {
        const initializeApp = async () => {
            if (initialState) return;
            let restoredFromCache = false;
            let restoredAge = Infinity;
            
            try {
                if (typeof window !== 'undefined') {
                    // Try to restore state from history.state
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

                    // Fallback: sessionStorage
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

            if (restoredFromCache && restoredAge < REFRESH_THRESHOLD) {
                return;
            }

            try {
                if (!restoredFromCache) setLoading(true);
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

                setCurrentTag(initialTag);

                // Build params based on initialTag
                const params = { page: 1 };
                if (initialTag !== 'for-you') params.tag = initialTag;

                // Get initial stories
                const initialStories = await storiesApi.getPaginatedStories(params);
                setStories(initialStories.results || []);
                setHasNext(initialStories.next !== null);
            } catch (error) {
                console.error('Error initializing app:', error);
            } finally {
                setLoading(false);
            }
        };
        
        initializeApp();
    }, [initialState]);

    // Persist home state
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
    const handleTagSwitch = useCallback(async (tag, { force = false } = {}) => {
        if (tag === currentTag && !force) return;

        setLoading(true);
        setPage(1);
        try {
            setCurrentTag(tag);

            // Always use paginated_stories with the appropriate tag
            const params = { page: 1 };
            if (tag !== 'for-you') params.tag = tag;

            const result = await storiesApi.getPaginatedStories(params);
            setStories(result.results || []);
            setHasNext(result.next !== null);
        } catch (error) {
            console.error('Error switching tag:', error);
        } finally {
            setLoading(false);
        }
    }, [currentTag]);
    
    // Handle infinite scroll
    const handleFetchMore = useCallback(async () => {
        if (isFetching || !hasNext) return;
        
        setIsFetching(true);
        try {
            const nextPage = page + 1;
            const params = { page: nextPage };
            if (currentTag !== 'for-you') params.tag = currentTag;
            
            const result = await storiesApi.getPaginatedStories(params);
            
            // Remove duplicates before adding new stories
            const existingIds = new Set(stories.map(s => s.id));
            const newStories = (result.results || []).filter(s => !existingIds.has(s.id));
            
            if (newStories.length > 0) {
                setStories(prev => [...prev, ...newStories]);
                setPage(nextPage);
            }
            
            setHasNext(result.next !== null);
        } catch (error) {
            console.error('Error fetching more stories:', error);
        } finally {
            setIsFetching(false);
        }
    }, [isFetching, hasNext, page, currentTag, stories]);
    
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
    const handleOpenStoryVerses = useCallback((storyId, fromGrid = false, bySwipe = false) => {
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
        handleTagSwitch,
        handleFetchMore,
        handleFollowUser,
        handleOpenStoryVerses,
        handleLikeToggle,
        handleSaveToggle,
        refreshAuth
    };
}