# Verse Scrolling & Like/Save State Fix

## Problem Statement

**Issue**: When scrolling through verses in the VerseViewer, the like/save state would sometimes get affected or reset when scrolling to different verses.

**User Complaint**: 
- "When we scroll, it should NOT affect the liking"
- "Like in StoryCard, when we scroll to another story, it doesn't affect the current story's like state"
- "Why is it affecting verses when scrolling?"

## Root Cause Analysis

### Backend (✅ CORRECT)
The Django backend API endpoints are working correctly:
- `toggle_verse_like` endpoint receives a **specific verse_slug**
- It creates/deletes interaction for **that exact verse only**
- Updates only **that verse's likes_count**
- Each verse interaction is isolated and independent

**Backend is NOT the issue** - it's correctly per-verse.

### Frontend (⚠️ BUGS FOUND)

#### Bug #1: IntersectionObserver Dependency Issue
**File**: `VerseViewer.js` Line 937
**Problem**: 
```javascript
}, [currentVerseIndex, storyRef.current?.verses]);  // ❌ WRONG
```

**Why it's wrong**:
- `storyRef` is a `useRef`, not state
- Refs don't trigger dependency updates
- `storyRef.current?.verses` is unreliable for dependencies
- The observer cleanup/setup might not happen at the right times

**Impact**:
- Observer might not properly sync when verses load
- Could cause cached data to be stale or unused

#### Bug #2: Cache Update Logic Using Logical OR
**File**: `VerseViewer.js` Line 976-978 (old code)
**Problem**:
```javascript
is_liked_by_user: response.is_liked_by_user || response.user_has_liked || !wasLiked
```

**Why it's wrong**:
- If backend returns `{is_liked_by_user: false, user_has_liked: false, likes_count: 5}`
- The logical OR would evaluate to `false || false || true` = `true` (opposite of intended!)
- This causes the UI to show "liked" when it should show "unliked"

**Impact**:
- Cache stores WRONG state
- When you scroll to another verse and back, the WRONG state is restored
- Appears as if like state gets "affected" by scrolling

## Solution

### Fix #1: Fix IntersectionObserver Dependencies ✅
```javascript
// Before (WRONG)
}, [currentVerseIndex, storyRef.current?.verses]);

// After (CORRECT)
}, [currentVerseIndex]);
```

**Why this works**:
- `currentVerseIndex` is state, so it triggers properly
- The verses data is already in the closure from `storyRef.current`
- The observer correctly watches for index changes

### Fix #2: Fix Cache Update Logic with Proper Null Checks ✅

**Before (WRONG)**:
```javascript
setIsLiked(response.is_liked_by_user || response.user_has_liked || !wasLiked);
setLikeCount(response.likes_count || likeCount);

verseMetadataRef.current[currentVerse.id] = {
  ...verseMetadataRef.current[currentVerse.id],
  is_liked_by_user: response.is_liked_by_user || response.user_has_liked || !wasLiked,
  likes_count: response.likes_count || likeCount
};
```

**After (CORRECT)**:
```javascript
// Properly handle false vs undefined
const finalIsLiked = response.is_liked_by_user !== undefined 
  ? response.is_liked_by_user 
  : (response.user_has_liked !== undefined 
      ? response.user_has_liked 
      : !wasLiked);
const finalLikeCount = response.likes_count !== undefined ? response.likes_count : likeCount;

setIsLiked(finalIsLiked);
setLikeCount(finalLikeCount);

// Update cache with exact verse ID
if (verseMetadataRef.current[currentVerse.id]) {
  verseMetadataRef.current[currentVerse.id].is_liked_by_user = finalIsLiked;
  verseMetadataRef.current[currentVerse.id].likes_count = finalLikeCount;
} else {
  verseMetadataRef.current[currentVerse.id] = {
    is_liked_by_user: finalIsLiked,
    is_saved_by_user: isSaved,
    likes_count: finalLikeCount,
    saves_count: saveCount
  };
}
```

**Why this works**:
- `!== undefined` checks allow for `false` boolean values
- Logical OR (`||`) would convert `false` to `true`, which is wrong
- Using undefined checks preserves the actual boolean state
- Cache is updated with the correct verse ID
- Each verse maintains its own independent like/save state

## How It Works Now

### Verse State Flow:
1. **Story loads** → Cache initialized for all verses
2. **User clicks verse button** → VerseViewer opens with first verse
3. **User scrolls to verse B** → IntersectionObserver detects it
4. **Observer reads from cache** → Verse B's state restored accurately
5. **User likes verse B** → Cache updated with correct boolean value
6. **User scrolls back to verse A** → Verse A's state restored from cache
7. **State is NOT affected** → Each verse is independent

### The Cache Structure:
```javascript
verseMetadataRef.current = {
  [verseID1]: {
    is_liked_by_user: false,    // ← True boolean value, not converted
    is_saved_by_user: true,     // ← Can be false without converting to true
    likes_count: 42,
    saves_count: 15
  },
  [verseID2]: {
    is_liked_by_user: true,
    is_saved_by_user: false,
    likes_count: 128,
    saves_count: 8
  }
}
```

## Expected Behavior After Fix

✅ **Scrolling between verses does NOT affect their like/save state**
- Verse A stays liked/unliked
- Verse B is independent
- No state leakage between verses

✅ **Like counts are accurate**
- Shows correct count even after scrolling
- Cache prevents unnecessary API calls
- State persists through modal opens/closes

✅ **Just like StoryCard**
- Scrolling to another story doesn't reset like state
- Same behavior now for verses within a story

## Files Modified
- `src/app/components/VerseViewer.js`
  - Line 937: Fixed IntersectionObserver dependencies
  - Lines 976-991: Fixed like cache update logic
  - Lines 1048-1063: Fixed save cache update logic

## Testing Checklist

- [ ] Open a story with multiple verses
- [ ] Like verse #1 (icon should fill, count increases)
- [ ] Scroll to verse #2
- [ ] Like/save verse #2 (independent action)
- [ ] Scroll back to verse #1
- [ ] Verify verse #1 still shows as liked (NOT reset)
- [ ] Verify verse #1 like count is correct
- [ ] Scroll to verse #3 (new verse)
- [ ] Verify all previous verses maintain their state
- [ ] Close and reopen verse viewer
- [ ] Verify state persists

## Technical Details

### Why the Backend is Correct
```python
# Django Backend - toggle_verse_like endpoint
verse = Verse.objects.get(slug=verse_slug)  # ← Gets SPECIFIC verse
interaction, created = Interaction.objects.get_or_create(
    user=request.user,
    verse=verse,              # ← For THIS verse only
    interaction_type='LIKE'
)
# ✅ Only updates THIS verse's likes_count
```

### Frontend Cache Strategy
The frontend uses a `useRef` to maintain an in-memory cache:
- **Why useRef?** Doesn't trigger re-renders when cache updates
- **Why in-memory?** Fast reads, survives component re-renders
- **Why per-verse-ID?** Each verse tracked independently
- **Why manual updates?** Ensures cache always matches UI state

This is the same pattern used successfully in StoryCard for story likes!

## Related Files
- `src/app/components/StoryCard.js` - Similar pattern for story likes
- `src/app/components/VerseViewer.js` - Verse interaction handling
- Backend: `core/views.py` InteractionViewSet.toggle_verse_like
