# Like & Save Feature - Visual Architecture Guide

## 🏗️ Component Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  FeedClient                                         │
│  (Main feed component)                              │
├─────────────────────────────────────────────────────┤
│  └─ StoryCard (per story)                           │
│     ├─ TitleSection                                 │
│     ├─ TagsSection                                  │
│     ├─ ImageContent                                 │
│     └─ ActionButtons ⭐ (THE MAGIC HAPPENS HERE)   │
│        ├─ Like Button (with ❤️ icon & count)      │
│        ├─ Comment Button (with 💬 icon & count)   │
│        ├─ Share Button (with 📤 icon & count)     │
│        └─ Save Button (with 📌 icon & count)      │
└─────────────────────────────────────────────────────┘
```

## 🔗 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  USER INTERACTION (Click ❤️)                            │
│         │                                                │
│         ▼                                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ActionButtons Component                            │ │
│  │ handleLikeClick() triggered                        │ │
│  └────────────┬─────────────────────────────────────┘ │
│               │                                        │
│               ▼                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ useUserInteractions Hook                           │ │
│  │ ├─ toggleLike(currentCount)                        │ │
│  │ │  ├─ Check: isAuthenticated? → show auth modal   │ │
│  │ │  ├─ Check: isLoading? → return early            │ │
│  │ │  ├─ setIsLikeLoading(true)                      │ │
│  │ │  ├─ OPTIMISTIC UPDATE:                          │ │
│  │ │  │  ├─ setIsLiked(!isLiked)                     │ │
│  │ │  │  └─ setLikeCount(+1 or -1)                   │ │
│  │ │  ├─ localStorage.setItem() → persist             │ │
│  │ │  └─ setTimeout(300ms) → debounced API call      │ │
│  │ └─ storiesApi.toggleStoryLike(storyId)           │ │
│  │    ├─ POST /api/interactions/toggle_story_like/   │ │
│  │    ├─ Body: { story_id: 123 }                     │ │
│  │    └─ Response: { likes_count: 42, ... }          │ │
│  └────────────┬─────────────────────────────────────┘ │
│               │                                        │
│               ├─ SUCCESS ✅                            │
│               │  ├─ State confirmed                    │
│               │  ├─ likeCount from response            │
│               │  └─ UI matches backend                 │
│               │                                        │
│               └─ ERROR ❌                              │
│                  ├─ Rollback isLiked                   │
│                  ├─ Rollback likeCount                 │
│                  ├─ Rollback localStorage              │
│                  └─ Silent failure (no popup)          │
│                                                        │
│  RESULT: Like persists in localStorage ✅             │
└──────────────────────────────────────────────────────────┘
```

## 💾 Storage Architecture

```
┌─────────────────────────────────────────────┐
│         Browser localStorage                │
├─────────────────────────────────────────────┤
│                                             │
│  For Story #1 (id=123):                    │
│  ├─ story_123_liked: "true"                │
│  ├─ story_123_saved: "false"               │
│  └─ story_123_likeCount: "42"              │
│                                             │
│  For Story #2 (id=456):                    │
│  ├─ story_456_liked: "false"               │
│  ├─ story_456_saved: "true"                │
│  └─ story_456_likeCount: "18"              │
│                                             │
│  ... (repeats for all stories)             │
│                                             │
└─────────────────────────────────────────────┘
           │
           │ (survives)
           ▼
  ┌─────────────────────┐
  │ Browser Restart     │
  │ Page Refresh        │
  │ Device Restart      │
  │ Tag Switch          │
  └─────────────────────┘
```

## 🔄 State Lifecycle Diagram

```
INITIAL STATE
    │
    ├─ isLiked: false
    ├─ isSaved: false
    ├─ likeCount: 0
    └─ isLikeLoading: false

         ▼

USER CLICK → "LOADING STATE"
    │
    ├─ isLikeLoading: true ← prevents re-clicks
    ├─ UI slightly faded
    └─ Button disabled

         ▼

OPTIMISTIC UPDATE
    │
    ├─ isLiked: true ✨ (instant)
    ├─ likeCount: 1 ✨ (instant)
    ├─ UI updates immediately
    └─ Heart turns orange ❤️

         ▼

localStorage UPDATE
    │
    ├─ Save to disk 💾 (milliseconds)
    └─ Survives browser restart

         ▼

BACKGROUND API SYNC (300ms later)
    │
    ├─ isLikeLoading: false ← done
    └─ POST /api/.../toggle_story_like/

         ▼

SYNC COMPLETE
    │
    ├─ Backend confirms ✅
    ├─ State matches server
    └─ User sees no loading spinner

   OR

SYNC ERROR
    │
    ├─ Network down ❌
    ├─ API error ❌
    │
    └─ ROLLBACK:
       ├─ isLiked: false (restore)
       ├─ likeCount: 0 (restore)
       ├─ localStorage: reverted
       └─ Silent (no error popup)
```

## 📱 Per-Story State Instance

```
Each Story Gets Its Own:

┌─────────────────────────────────────────┐
│ Story #1 (id=123)                       │
├─────────────────────────────────────────┤
│ useUserInteractions(123)                │
│ ├─ isLiked: true                        │
│ ├─ isSaved: false                       │
│ ├─ likeCount: 42                        │
│ ├─ isLikeLoading: false                 │
│ └─ isSaveLoading: false                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Story #2 (id=456)                       │
├─────────────────────────────────────────┤
│ useUserInteractions(456)                │
│ ├─ isLiked: false                       │
│ ├─ isSaved: true                        │
│ ├─ likeCount: 18                        │
│ ├─ isLikeLoading: false                 │
│ └─ isSaveLoading: false                 │
└─────────────────────────────────────────┘

    ↓ (Each independent)
    
No conflicts between stories ✅
```

## 🎯 Hook Dependencies Map

```
useUserInteractions(storyId)
    │
    ├─ Depends on:
    │  ├─ useAuth() → isAuthenticated
    │  ├─ useState() → all state
    │  ├─ useEffect() → initialize from localStorage
    │  ├─ useCallback() → optimize functions
    │  └─ useRef() → track pending operations
    │
    ├─ Uses:
    │  ├─ localStorage.getItem()
    │  ├─ localStorage.setItem()
    │  ├─ storiesApi.toggleStoryLike()
    │  └─ storiesApi.toggleStorySave()
    │
    └─ Returns:
       ├─ State: isLiked, isSaved, likeCount
       ├─ Loading: isLikeLoading, isSaveLoading
       ├─ Actions: toggleLike, toggleSave
       └─ Helpers: initializeLikeCount, hasPendingLike
```

## 🔀 Context & Global State

```
AuthContext
    │
    ├─ currentUser ──────→ used by useUserInteractions
    │  │                  (to identify user for auth check)
    │  └─ isAuthenticated ─→ used by useUserInteractions
    │                       (to show auth modal if needed)
    │
    └─ used in ActionButtons
       (to trigger auth event)

useMain Hook
    │
    ├─ storyLikeCounts ──→ global tracking
    ├─ getStoryLikeCount() → get by storyId
    └─ updateStoryLikeCount() → update by storyId
```

## 📊 Timing Diagram

```
Timeline (milliseconds):

T=0ms     User clicks ❤️
          │
T=0-5ms   ├─ Optimistic update (isLiked = true)
          ├─ UI re-renders instantly
          ├─ Heart turns orange
          └─ Count increments

T=1-2ms   └─ localStorage.setItem()
            (Saved to disk)

T=2-300ms └─ Debounce timer running
            (More clicks? Reset timer)

T=300ms+  └─ API call sent
            POST /api/.../toggle_story_like/

T=300-1000ms  Wait for server response
              (User doesn't see loading state)

T=1000ms  ├─ Success ✅
          │  ├─ State confirmed
          │  ├─ UI matches backend
          │  └─ Done
          │
          └─ Error ❌
             ├─ Rollback state
             ├─ Revert localStorage
             └─ Silent failure
```

## 🎨 UI State Visual

```
INACTIVE STATE (not liked)              ACTIVE STATE (liked)
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ ┌────────────────────────────┐       │ ┌────────────────────────────┐
│ │  ┌──────┐                  │       │ │  ┌──────┐ (pulsing)         │
│ │  │  ❤️  │ (outline)        │       │ │  │  ❤️  │ (filled, orange)  │
│ │  └──────┘                  │       │ │  └──────┘ animate_pulse     │
│ │  White 20% opacity         │       │ │  Orange #ff6b35            │
│ │  Border white/20           │       │ │  Border 2px #ff6b35        │
│ │                            │       │ │  Background #ff6b35/20     │
│ │  hover:                    │       │ │                            │
│ │  • Scale 110%              │       │ │  (always pulsing when     │
│ │  • Border #00d4ff          │       │ │   active)                 │
│ │  • BG #00d4ff/20           │       │ │                            │
│ │                       42   │       │ │                       42   │
│ │  ┌─────────────────────┐   │       │ │  ┌─────────────────────┐   │
│ │  │      42 Likes   │       │       │ │  │      42 Likes       │   │
│ │  └─────────────────┘   │   │       │ │  └─────────────────────┘   │
│ │  (badge, orange)       │   │       │ │  (badge, orange)           │
│ └────────────────────────┘   │       │ │  └────────────────────────┘
└──────────────────────────────┘       └──────────────────────────────┘

LOADING STATE (during API sync)
┌──────────────────────────────┐
│ ┌────────────────────────────┐
│ │  ┌──────┐                  │
│ │  │  ❤️  │ (outline)        │
│ │  └──────┘                  │
│ │  Opacity 70% (faded)       │
│ │  Cursor not-allowed        │
│ │  Disabled (no click)       │
│ │                       42   │
│ │  ┌─────────────────────┐   │
│ │  │      42 Likes       │   │
│ │  └─────────────────────┘   │
│ └────────────────────────────┘
└──────────────────────────────┘
```

## 🔒 Error Handling Flow

```
API CALL SENT
    │
    ├─ SUCCESS (200) ✅
    │  ├─ Parse response
    │  ├─ Update likeCount from server
    │  └─ Keep optimistic state
    │
    ├─ NETWORK ERROR
    │  ├─ isLiked → rollback
    │  ├─ likeCount → rollback
    │  └─ localStorage → revert
    │
    └─ API ERROR (400/500/etc)
       ├─ isLiked → rollback
       ├─ likeCount → rollback
       └─ localStorage → revert
```

## 📈 Scalability Diagram

```
10 stories on page:
├─ 10 useUserInteractions instances
├─ 10 independent state objects
├─ ~1KB total memory
├─ ~1KB total localStorage
└─ Zero conflicts ✅

100 stories (infinite scroll):
├─ 100 useUserInteractions instances
├─ 100 independent state objects
├─ ~10KB total memory
├─ ~10KB total localStorage
└─ Performance: Excellent ⚡

1000+ stories (over time):
├─ localStorage can handle millions
├─ No browser issues
└─ Graceful degradation if quota hit
```

---

This visual guide helps understand how all the pieces fit together! 🎯
