// useMain.js
import { useState, useEffect, useCallback } from 'react';
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
    
    const { currentUser, isAuthenticated, refreshAuth } = useAuth();
    
    // Initialize the app
    useEffect(() => {
        const initializeApp = async () => {
            if (initialState) return;
            
            try {
                setLoading(true);
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
                setError(error.message || 'Failed to load stories');
            } finally {
                setLoading(false);
            }
        };
        
        initializeApp();
    }, [initialState]);
    
    // Handle tag switching
    const handleTagSwitch = useCallback(async (tag, { force = false } = {}) => {
        // Always proceed if force is true, even if tag is the same
        if (tag === currentTag && !force) return;

        setLoading(true);
        setPage(1);
        setError(null);
        try {
            setCurrentTag(tag);

            // Always use paginated_stories with the appropriate tag
            const params = { page: 1 };
            if (tag !== 'for-you') params.tag = tag;

            const result = await storiesApi.getPaginatedStories(params);
            // If forcing a refresh on the 'for-you' feed, shuffle results
            // client-side to provide a new, randomized ordering even when
            // the backend returns the same set.
            const fetched = result.results || [];
            if (force && tag === 'for-you' && Array.isArray(fetched) && fetched.length > 1) {
                // Fisher-Yates shuffle (in-place)
                for (let i = fetched.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    const tmp = fetched[i];
                    fetched[i] = fetched[j];
                    fetched[j] = tmp;
                }
            }

            setStories(fetched);
            setHasNext(result.next !== null);
        } catch (error) {
            console.error('Error switching tag:', error);
            setError(error.message || 'Failed to load stories');
        } finally {
            setLoading(false);
        }
    }, [currentTag]);
    
    // Handle infinite scroll
    const handleFetchMore = useCallback(async () => {
        if (isFetching || !hasNext) return;
        
        setIsFetching(true);
        setError(null);
        try {
            const nextPage = page + 1;
            const params = { page: nextPage };
            if (currentTag !== 'for-you') params.tag = currentTag;
            
            const result = await storiesApi.getPaginatedStories(params);
            const newStories = result.results || [];
            
            // Remove duplicates before adding new stories
            const existingIds = new Set(stories.map(s => s.id));
            const filteredStories = newStories.filter(s => !existingIds.has(s.id));
            
            if (filteredStories.length > 0) {
                setStories(prev => [...prev, ...filteredStories]);
                setPage(nextPage);
            }
            
            setHasNext(newStories.length >= 5); // Assuming page size is 5
        } catch (error) {
            console.error('Error fetching more stories:', error);
            setError(error.message || 'Failed to load more stories');
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