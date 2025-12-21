// useMain.js - Simplified without backend logic
export default function useMain() {
    return {
        stories: [],
        loading: false,
        hasMore: false,
        isFetching: false,
        currentTag: 'for-you',
        currentDimension: 'feed',
        currentUser: null,
        followingUsers: [],
        isAuthenticated: false,
        error: null,
        nextCursor: null,
        totalCount: 0,
        handleTagSwitch: () => {},
        handleFetchMore: () => {},
        handleFollowUser: () => {},
        handleOpenStoryVerses: () => {},
        refreshStories: () => {},
        refreshAuth: () => {},
        prefetchNext: () => {},
    };
}