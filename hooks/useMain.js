// useMain.js
import { useState, useEffect, useCallback } from 'react';
import { storiesApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function useMain() {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasNext, setHasNext] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [currentTag, setCurrentTag] = useState('for-you');
    const [currentDimension, setCurrentDimension] = useState('feed');
    const [followingUsers, setFollowingUsers] = useState([]);
    const [userInteractions, setUserInteractions] = useState({});
    const [page, setPage] = useState(1);
    
    // Use the AuthContext instead of local auth state
    const { currentUser, isAuthenticated, refreshAuth } = useAuth();
    
    // Initialize the app (check for /tags/:tag in URL and load accordingly)
    useEffect(() => {
        const initializeApp = async () => {
            try {
                setLoading(true);
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
                setPage(1);

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
    }, []);
    
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