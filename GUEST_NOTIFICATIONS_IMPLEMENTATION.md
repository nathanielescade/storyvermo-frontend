# Guest Notification System - Frontend Implementation Guide

## 📋 Overview

The guest notification system displays contextual notifications to unauthenticated users based on their visit count and engagement level. The system automatically manages notification state, animations, and analytics tracking.

## 🎯 Components & Files Created

### 1. **hooks/useGuestNotifications.js**
Core React hook for managing guest notification state and interactions.

**Features:**
- Fetches notifications from `/api/notifications/guest_notifications/`
- Manages dismissed notifications in sessionStorage
- Handles authentication state and visit count tracking
- Provides analytics tracking functions
- Silent error handling (no user-facing errors)

**Usage:**
```javascript
import { useGuestNotifications } from '@/hooks/useGuestNotifications'

function MyComponent() {
  const {
    notification,
    visitCount,
    isAuthenticated,
    isLoading,
    dismissNotification,
    trackNotificationShown,
    trackCTAClicked
  } = useGuestNotifications()
  
  // Use these values...
}
```

**Returns:**
- `notification`: Current notification object or null
- `visitCount`: Number of times user has visited
- `isAuthenticated`: Whether user is logged in
- `isLoading`: Initial fetch is loading
- `dismissNotification(id)`: Function to dismiss a notification
- `trackNotificationShown(notification)`: Track analytics
- `trackCTAClicked(notification)`: Track CTA clicks

---

### 2. **src/app/components/GuestNotificationBanner.js**
Slide-in banner component for low/medium priority notifications.

**Features:**
- Smooth slide-in animation from top
- Auto-dismiss for low priority (after 8 seconds)
- Manual dismiss button (if enabled)
- CTA button with route linking
- Priority-based coloring
- Responsive design (mobile, tablet, desktop)
- Visit count indicator

**Props:**
```javascript
<GuestNotificationBanner
  notification={{
    id: 'notif-1',
    type: 'GUEST_WELCOME',
    title: 'Welcome to StoryVermo!',
    message: 'Start sharing your stories today.',
    cta: 'Get Started',
    cta_url: '/',
    emoji: '🎉',
    priority: 2,
    dismiss_count: 1
  }}
  onDismiss={() => { /* handle dismiss */ }}
  onCTA={() => { /* track CTA click */ }}
  visitCount={1}
/>
```

**Priority Styling:**
- Priority 1 (High): Red gradient with strong shadow
- Priority 2 (Medium): Purple gradient
- Priority 3+ (Low): Blue gradient (auto-dismisses after 8s)

---

### 3. **src/app/components/GuestNotificationModal.js**
Full-screen modal for high-priority notifications.

**Features:**
- Only displays for priority=1 notifications
- Modal overlay with backdrop blur
- Prevents body scroll when open
- Primary CTA button
- Secondary "Maybe Later" button
- Cannot be auto-dismissed
- Large, prominent emoji and title
- Close button in corner

**Props:**
```javascript
<GuestNotificationModal
  notification={{
    id: 'notif-1',
    type: 'GUEST_ALERT',
    title: 'Important Announcement',
    message: 'Read this important update...',
    cta: 'Read More',
    cta_url: '/announcements',
    emoji: '🔔',
    priority: 1,
    dismiss_count: 0
  }}
  onClose={() => { /* handle close */ }}
  onCTA={() => { /* track CTA */ }}
/>
```

---

### 4. **src/app/components/GuestNotificationContainer.js**
Smart container that manages banner and modal logic.

**Features:**
- Automatically selects banner or modal based on priority
- Handles all notification interactions
- Integrates analytics tracking
- Only shows for unauthenticated users
- Respects loading state

**Integration:**
Already added to `src/app/layout.js`, so it works globally across all pages.

---

### 5. **lib/guestNotificationUtils.js**
Utility functions for guest notification management.

**Functions:**
- `getDismissedNotifications()`: Get dismissed notification IDs
- `clearDismissedNotifications()`: Clear session storage
- `isNotificationDismissed(id)`: Check if dismissed
- `getVisitCount()`: Get stored visit count
- `incrementVisitCount()`: Increment and return count
- `shouldShowNotification(visitCount, notification)`: Determine visibility
- `formatNotification(notification)`: Normalize notification data
- `isValidNotification(notification)`: Validate notification structure
- `trackGuestAnalytic(eventName, data)`: Send analytics events

**Usage:**
```javascript
import {
  formatNotification,
  isValidNotification,
  trackGuestAnalytic
} from '@/lib/guestNotificationUtils'

// Format and validate
const formatted = formatNotification(rawNotification)
if (isValidNotification(formatted)) {
  // Use notification
  trackGuestAnalytic('notification_displayed', {
    type: formatted.type,
    visit_count: 5
  })
}
```

---

## 🔌 Integration Steps

### Already Done:
✅ Added `import GuestNotificationContainer from './components/GuestNotificationContainer'` to `src/app/layout.js`
✅ Added `<GuestNotificationContainer />` to the layout body

### To Verify:
1. Check that `/api/notifications/guest_notifications/` endpoint works
2. Test with a guest (non-authenticated) user
3. Verify notifications appear on page load

---

## 📊 Data Flow

```
┌─────────────────────────────┐
│  Page Load (Guest User)     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ GuestNotificationContainer  │
│ (Renders in layout.js)      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  useGuestNotifications()    │
│  (Fetches from API)         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  /api/notifications/        │
│  guest_notifications/       │
│  (Returns: notifications    │
│   visit_count, auth status) │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Priority == 1?              │
│  YES → Modal                │
│  NO  → Banner               │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Display & Await Interaction │
│ (User dismisses/clicks CTA) │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Track Analytics             │
│ Store Dismissed State       │
└─────────────────────────────┘
```

---

## 🎨 Styling Guide

### Colors by Priority
```
Priority 1 (High - Modal):
- Background: slate-900 to slate-800
- Border: slate-700
- CTA: cyan-500 to blue-600

Priority 1 (High - Banner):
- Background: red-500 to pink-600
- Shadow: red-500/50

Priority 2 (Medium - Banner):
- Background: purple-500 to indigo-600
- Shadow: purple-500/40

Priority 3+ (Low - Banner):
- Background: blue-500 to cyan-600
- Shadow: blue-500/30
```

### Responsive Sizes
```
Mobile:
- Padding: p-4
- Font: text-xs to text-sm
- Emoji: text-2xl (banner), text-4xl (modal)
- Banner width: full with margins

Tablet:
- Same as mobile

Desktop:
- Padding: p-4 to p-8
- Max-width: md (banner), md (modal)
- Font: text-sm to text-base
- Emoji: text-3xl (banner), text-5xl (modal)
```

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Notification appears on first visit (visit_count=1)
- [ ] Different notifications at visits 1, 3, 5, 10, 15
- [ ] CTA button navigates to correct URL
- [ ] Dismiss button hides banner
- [ ] Works on mobile viewport
- [ ] Does NOT show to authenticated users
- [ ] Persists across page refresh in same session
- [ ] New session shows new notification

### Priority 1 (Modal)
- [ ] Modal displays in center with backdrop
- [ ] User cannot dismiss (no close button that works)
- [ ] "Maybe Later" button closes modal
- [ ] CTA button navigates correctly
- [ ] Body scroll is prevented while open
- [ ] Background is blurred

### Priority 2+ (Banner)
- [ ] Banner slides in from top smoothly
- [ ] Auto-dismisses after 8 seconds
- [ ] Manual dismiss button works (if enabled)
- [ ] Gradient colors match priority

### Analytics
- [ ] 'guest_notification_shown' event fires
- [ ] 'guest_notification_cta_clicked' event fires
- [ ] 'guest_notification_dismissed' event fires (when manually dismissed)
- [ ] Visit count is tracked correctly

### Edge Cases
- [ ] Handles network errors gracefully (silent fail)
- [ ] Shows nothing if API is down
- [ ] Multiple notifications don't stack
- [ ] Works with different screen sizes
- [ ] Works with browser back/forward buttons

---

## 🔄 Session Management

### SessionStorage
```javascript
// Stores dismissed notification IDs in current session
sessionStorage.dismissedGuestNotifications
// Example: ['notif-1', 'notif-5']
```

### LocalStorage
```javascript
// Persists across sessions for analytics
localStorage.guestVisitCount  // Example: 15
```

### Clearing State
```javascript
// Clear dismissed notifications (new session)
sessionStorage.removeItem('dismissedGuestNotifications')

// Reset visit count
localStorage.removeItem('guestVisitCount')
```

---

## 📱 Responsive Behavior

### Mobile (< 640px)
- Banner: Full width with padding (left-4 right-4)
- Position: Top center
- Emoji: 2xl size
- Font: xs to sm
- Auto-dismiss: Yes (8s)

### Tablet (640px - 1024px)
- Banner: Same as mobile
- Modal: Center with padding

### Desktop (> 1024px)
- Banner: Max-width md (500px), centered at top
- Modal: Center screen, max-width md (500px)
- Emoji: Larger (3xl banner, 5xl modal)
- Font: Larger (sm to base)

---

## 🐛 Debugging

### Check Hook State
```javascript
// In browser console
import { useGuestNotifications } from '@/hooks/useGuestNotifications'
const { notification, visitCount, isAuthenticated } = useGuestNotifications()
console.log({ notification, visitCount, isAuthenticated })
```

### Verify API Endpoint
```javascript
// Test fetch
fetch('/api/notifications/guest_notifications/')
  .then(r => r.json())
  .then(console.log)
```

### Check SessionStorage
```javascript
// In browser console
sessionStorage.getItem('dismissedGuestNotifications')
sessionStorage.getItem('guestVisitCount') // If using localStorage
```

### Enable Debug Logging
The components use `console.debug` for non-critical logs. Enable them:
```javascript
// In browser console
localStorage.debug = '*'
```

---

## 🚀 Performance Considerations

- Hook fetches on mount and on dismissal changes
- Dismissed notifications stored in memory (Set) for fast lookups
- Silent error handling prevents layout breaks
- No layout shift when notification appears/disappears
- CSS animations are GPU-accelerated (transform, opacity)

---

## 📞 API Integration

### Endpoint: GET /api/notifications/guest_notifications/
**Query Parameters:** None (no auth required)

**Response Structure:**
```json
{
  "guest_notifications": [
    {
      "id": "notif-1",
      "type": "GUEST_WELCOME",
      "title": "Welcome to StoryVermo",
      "message": "Start sharing your stories today",
      "cta": "Get Started",
      "cta_url": "/signup",
      "emoji": "🎉",
      "priority": 2,
      "dismiss_count": 1,
      "visit_count": 1
    }
  ],
  "visit_count": 1,
  "is_authenticated": false
}
```

### Expected Behavior by Visit Count
- Visit 1: WELCOME notification
- Visit 3: EXPLORE notification
- Visit 5: COMMUNITY notification
- Visit 10: ENGAGEMENT notification
- Visit 15+: BADGES notification

---

## 🔧 Customization

### Add Custom Notification Type
1. Add new type constant to backend
2. Add formatting in `formatNotification()`
3. Add styling rules in components
4. Test across all viewports

### Change Animation Speed
In `GuestNotificationBanner.js`:
```javascript
// Change duration-300 to duration-500 for slower animation
className={`... duration-300 ...`}
```

### Modify Auto-dismiss Time
In `GuestNotificationBanner.js`:
```javascript
// Change 8000 to desired milliseconds
const timer = setTimeout(() => {
  handleDismiss();
}, 8000); // Currently 8 seconds
```

### Disable Analytics
In `useGuestNotifications.js`:
```javascript
// Comment out gtag calls
// window.gtag('event', 'guest_notification_shown', {...})
```

---

## ✅ Verification Steps

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open in guest/incognito mode** (or logout)

3. **Check for notification** on first page load

4. **Open DevTools → Network** and verify:
   - GET `/api/notifications/guest_notifications/` returns 200
   - Response has `guest_notifications` array

5. **Check DevTools → Application:**
   - SessionStorage has `dismissedGuestNotifications`
   - LocalStorage has `guestVisitCount`

6. **Test interactions:**
   - Click CTA button → navigates to URL
   - Click dismiss → notification disappears
   - Refresh page → notification returns (same session)

---

## 🎓 Key Concepts

### Priority Levels
- **1**: High priority, displayed as modal, cannot be dismissed
- **2**: Medium priority, displayed as banner, can be dismissed
- **3+**: Low priority, displayed as banner, auto-dismisses after 8s

### Dismiss Count
- `0`: Cannot be dismissed by user (no dismiss button shown)
- `> 0`: Can be dismissed by user (dismiss button visible)

### Visit Count
- Tracks number of page visits/sessions
- Used by backend to determine which notification to show
- Persisted in localStorage for analytics

### Session Management
- Dismissed notifications are cleared on new session
- Dismissed notifications persist in sessionStorage within same session
- User won't see same notification twice in same session

---

## 📚 Files Structure

```
storyvermo-frontend/
├── hooks/
│   └── useGuestNotifications.js       [NEW]
├── lib/
│   └── guestNotificationUtils.js      [NEW]
├── src/app/
│   ├── components/
│   │   ├── GuestNotificationBanner.js        [NEW]
│   │   ├── GuestNotificationModal.js         [NEW]
│   │   ├── GuestNotificationContainer.js     [NEW]
│   │   └── ...existing components
│   └── layout.js                      [UPDATED]
└── ...rest of project
```

---

## 🤝 Contributing

To add new features:
1. Update hook to fetch new data
2. Add component props as needed
3. Update utils for any new logic
4. Test across all viewports
5. Add to testing checklist

---

## 📄 License

Part of StoryVermo platform. See main LICENSE file.
