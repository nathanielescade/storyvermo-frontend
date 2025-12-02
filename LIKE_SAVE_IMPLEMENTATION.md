# Like & Save Functionality - Professional Implementation

## Overview
Professional Instagram-style like and save functionality with persistent state across page refreshes.

## Features Implemented

### 1. **Persistent State Management**
- ✅ Like/save state persists in `localStorage` for each story
- ✅ Like count updates persist across page refreshes
- ✅ Works everywhere story components are used

### 2. **Optimistic Updates**
- ✅ Instant UI feedback when user clicks like/save
- ✅ State updates immediately without waiting for API
- ✅ Automatic rollback on API errors

### 3. **API Synchronization**
- ✅ Changes sync to backend after debounce (300ms)
- ✅ Handles race conditions gracefully
- ✅ Automatic error handling with rollback

### 4. **Professional UX**
- ✅ Loading states prevent double-clicks
- ✅ Heart icon pulses when liked
- ✅ Bookmark icon fills when saved
- ✅ Like count badge updates in real-time
- ✅ Smooth transitions and hover effects

### 5. **Authentication Integration**
- ✅ Opens auth modal if user isn't authenticated
- ✅ Persists interactions for logged-in users only
- ✅ Clears state on logout

## Architecture

### New Files Created
1. **`hooks/useUserInteractions.js`** - Core interaction management hook
   - Handles localStorage persistence
   - Manages API sync with debouncing
   - Provides optimistic updates
   - Handles race conditions

### Updated Files
1. **`src/app/components/storycard/ActionButtons.js`**
   - Integrates `useUserInteractions` hook
   - Added loading states for like/save buttons
   - Added visual feedback with pulse animations

2. **`hooks/useMain.js`**
   - Added story like count tracking
   - Provides `getStoryLikeCount()` method
   - Provides `updateStoryLikeCount()` method
   - Initializes from localStorage on mount

## Usage Example

### In ActionButtons Component
```javascript
const {
    isLiked,
    isSaved,
    likeCount,
    isLikeLoading,
    isSaveLoading,
    toggleLike,
    toggleSave,
    initializeLikeCount,
} = useUserInteractions(story.id);

// Initialize with story's like count
useEffect(() => {
    initializeLikeCount(story.likes_count || 0);
}, [story.id]);

// Handle click
const handleLikeClick = async () => {
    await toggleLike(likeCount);
};
```

## State Persistence Flow

```
User clicks Like
    ↓
Optimistic update (instant)
    ↓
localStorage.setItem() (immediate)
    ↓
300ms debounce
    ↓
API call: toggleStoryLike()
    ↓
Backend updates
    ↓
Success: state synced ✓
OR
Error: rollback to previous state
```

## localStorage Schema

```javascript
// Like state for story with id=123
story_123_liked: "true" | "false"

// Save state for story with id=123
story_123_saved: "true" | "false"

// Like count for story with id=123
story_123_likeCount: "42"
```

## Key Implementation Details

### Optimistic Updates
- UI updates immediately on click
- localStorage updated instantly
- API sync happens in background with debounce
- User doesn't wait for network

### Debouncing
- 300ms debounce on API calls
- Prevents excessive backend requests
- If user clicks multiple times, only last request is sent

### Error Handling
- If API call fails, previous state is restored
- localStorage is rolled back to previous value
- User sees visual feedback of the error (no change)

### Race Conditions
- Uses refs to track pending operations
- Multiple rapid clicks are debounced
- Loading states prevent interaction during API call

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- localStorage support required
- Graceful degradation if localStorage unavailable

## Mobile Support
- Touch-friendly button sizes (w-10 h-10)
- No double-tap zoom issues
- Works with gesture-based scrolling
- Tested on iOS and Android

## Testing Checklist

✅ Like a story and refresh - like persists
✅ Save a story and refresh - save persists
✅ Like count updates and persists
✅ Unlike a story - count decreases and persists
✅ Open different stories - likes/saves are independent
✅ Switch to different tag/feed - likes/saves persist
✅ Close browser and reopen - all interactions preserved
✅ Logout and login with different user - interactions reset
✅ Network error during API call - state rolls back
✅ Very rapid clicks - debounced correctly

## Performance Optimizations

1. **Lazy localStorage access** - Only reads/writes needed data
2. **Debounced API calls** - Prevents backend spam
3. **Optimistic updates** - No waiting for network
4. **Isolated loading states** - Only affects clicked button
5. **useCallback optimization** - Prevents unnecessary re-renders

## Future Enhancements

- [ ] Add animations when like count changes
- [ ] Add undo/redo functionality
- [ ] Add batch sync for multiple stories
- [ ] Add analytics tracking for likes/saves
- [ ] Add trending/popular stories filter based on likes
- [ ] Add user's likes/saves page
- [ ] Add share via WhatsApp/social media

## Troubleshooting

**Issue: Likes not persisting after refresh**
- Check browser's localStorage is enabled
- Verify user is authenticated
- Check Network tab for API errors

**Issue: Like count shows wrong number**
- Clear browser cache and localStorage
- Refresh the page
- Check backend database directly

**Issue: Buttons feel slow**
- Check network speed in DevTools
- Verify API endpoint is responding
- Check for other background requests

## API Endpoints Used

```javascript
// Like interaction
POST /api/interactions/toggle_story_like/
Body: { story_id: number }

// Save interaction
POST /api/interactions/toggle_story_save/
Body: { story_id: number }
```

## Code Quality

- ✅ ESLint compliant
- ✅ No console errors or warnings
- ✅ Proper error handling
- ✅ TypeScript-ready structure
- ✅ Comprehensive comments
- ✅ Performance optimized

---

**Last Updated:** December 2, 2025
**Status:** Production Ready
