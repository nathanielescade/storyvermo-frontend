# Guest Notification System - Quick Reference

## 🚀 What Was Built

A complete guest notification system for unauthenticated users with:
- ✅ Auto-fetching notifications from backend API
- ✅ Smart banner and modal display based on priority
- ✅ Session-aware dismissal handling
- ✅ Analytics tracking integration
- ✅ Responsive mobile/tablet/desktop design
- ✅ Smooth animations and transitions
- ✅ Error handling (silent failures)

## 📁 Files Created

```
hooks/
  └── useGuestNotifications.js              (React hook - core logic)

lib/
  └── guestNotificationUtils.js             (Helper functions)

src/app/components/
  ├── GuestNotificationBanner.js            (Slide-in banner for priority 2-3)
  ├── GuestNotificationModal.js             (Full modal for priority 1)
  └── GuestNotificationContainer.js         (Smart orchestrator)

src/app/
  └── layout.js                             (UPDATED - added import & component)
```

## 🎯 How It Works

1. **On Page Load**
   - `GuestNotificationContainer` renders in root layout
   - `useGuestNotifications` hook fetches from `/api/notifications/guest_notifications/`
   - If authenticated user → nothing shows
   - If guest user → selects banner or modal based on priority

2. **Priority Routing**
   - `priority: 1` → Modal (cannot dismiss, must click CTA or close)
   - `priority: 2+` → Banner (can dismiss, auto-dismisses after 8s if low priority)

3. **State Management**
   - Dismissed notifications stored in `sessionStorage`
   - Visit count tracked in `localStorage`
   - Same notification never shows twice in same session

4. **User Interaction**
   - Click CTA → Navigate to `cta_url`, track analytics
   - Click Dismiss → Hide notification, mark as dismissed, track analytics
   - Auto-dismiss → Notification disappears after 8 seconds (low priority only)

## 💻 API Integration

**Endpoint:** `GET /api/notifications/guest_notifications/` (no auth required)

**Response:**
```json
{
  "guest_notifications": [
    {
      "id": "notif-1",
      "type": "GUEST_WELCOME",
      "title": "Welcome!",
      "message": "Start sharing stories",
      "cta": "Get Started",
      "cta_url": "/signup",
      "emoji": "🎉",
      "priority": 2,
      "dismiss_count": 1
    }
  ],
  "visit_count": 1,
  "is_authenticated": false
}
```

## 🎨 Styling Guide

**Priority 1 (Modal):**
- Dark gradient: slate-900 to slate-800
- CTA button: cyan to blue gradient
- Modal centered on screen
- Dark backdrop with blur

**Priority 2 (Medium Banner):**
- Gradient: purple-500 to indigo-600
- Shows at top of screen
- Manual dismiss button available
- No auto-dismiss

**Priority 3+ (Low Banner):**
- Gradient: blue-500 to cyan-600
- Shows at top of screen
- Auto-dismisses after 8 seconds
- Can be manually dismissed if enabled

## 🧪 Testing Quick Steps

```bash
# 1. Start dev server
npm run dev

# 2. Open in guest/incognito mode (not logged in)

# 3. Check Network tab in DevTools
# - Verify GET /api/notifications/guest_notifications/ returns 200

# 4. Check if notification appears
# - Should slide in from top (banner) or show centered (modal)

# 5. Test interactions
# - Click CTA button → should navigate
# - Click X button → should dismiss
# - Refresh page → should still show (same session)
# - Clear cache/new session → different notification

# 6. Check SessionStorage
# - DevTools → Application → Session Storage
# - Should have key: dismissedGuestNotifications
```

## 📊 Component Props Reference

### GuestNotificationBanner
```javascript
<GuestNotificationBanner
  notification={{
    id, type, title, message, cta, cta_url,
    emoji, priority, dismiss_count
  }}
  onDismiss={() => {}}
  onCTA={() => {}}
  visitCount={1}
/>
```

### GuestNotificationModal
```javascript
<GuestNotificationModal
  notification={{
    id, type, title, message, cta, cta_url,
    emoji, priority, dismiss_count
  }}
  onClose={() => {}}
  onCTA={() => {}}
/>
```

### GuestNotificationContainer
```javascript
// Self-contained, no props needed
// Automatically fetches and manages everything
<GuestNotificationContainer />
```

## 🔧 Hook Usage

```javascript
import { useGuestNotifications } from '@/hooks/useGuestNotifications'

export default function MyComponent() {
  const {
    notification,      // Current notification or null
    visitCount,        // Number of visits
    isAuthenticated,   // Is user logged in?
    isLoading,         // Initial fetch loading?
    error,             // Any error occurred?
    dismissNotification,
    trackNotificationShown,
    trackCTAClicked
  } = useGuestNotifications()

  // Your component logic
}
```

## 🛠️ Utility Functions

```javascript
import {
  getDismissedNotifications,
  clearDismissedNotifications,
  isNotificationDismissed,
  getVisitCount,
  incrementVisitCount,
  formatNotification,
  isValidNotification,
  trackGuestAnalytic
} from '@/lib/guestNotificationUtils'
```

## 🎛️ Customization Examples

### Change Auto-Dismiss Time
In `GuestNotificationBanner.js`, line ~25:
```javascript
// Change 8000 to desired milliseconds
const timer = setTimeout(() => handleDismiss(), 8000)
```

### Change Banner Position
In `GuestNotificationBanner.js`, line ~67:
```javascript
// Change `top-4` to desired position
className={`fixed top-4 left-4 right-4 z-50 ...`}
// Options: top-0, top-2, top-4, top-8, etc.
```

### Change Animation Duration
In `GuestNotificationBanner.js`, line ~67:
```javascript
// Change `duration-300` to duration-500 for slower
className={`... duration-300 ...`}
```

### Disable Analytics Tracking
In `useGuestNotifications.js`, lines ~60, ~71:
```javascript
// Comment out gtag calls
// window.gtag('event', 'guest_notification_shown', {...})
```

## ✅ Verification Checklist

- [ ] All 4 files created (hook, components, utils, layout updated)
- [ ] Layout imports GuestNotificationContainer correctly
- [ ] Container renders in layout.js body
- [ ] Backend API endpoint `/api/notifications/guest_notifications/` is ready
- [ ] Tested in guest/incognito mode (not authenticated)
- [ ] Notification fetches and displays on first visit
- [ ] CTA button navigates to correct URL
- [ ] Dismiss button works (if enabled)
- [ ] Notification reappears on page refresh (same session)
- [ ] Different notification on new session (cleared cache)
- [ ] Works on mobile viewport
- [ ] Modal displays correctly for priority=1
- [ ] Banner slides in for priority 2+
- [ ] Auto-dismiss works for low priority

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Notification not showing | Check if user is authenticated, check API endpoint, check browser console for errors |
| Wrong notification | Verify backend is sending correct visit_count threshold |
| Button not working | Check `cta_url` is set correctly, verify Link component is working |
| Dismiss not working | Check `dismiss_count > 0`, verify `onDismiss` callback is firing |
| Analytics not tracking | Check if `window.gtag` exists, verify Google Analytics is loaded |
| Notification showing to authenticated users | Check `isAuthenticated` is correctly set from API response |

## 📞 API Response Reference

Backend should return notifications with these fields:

| Field | Type | Required | Example |
|-------|------|----------|---------|
| id | string | ✅ | "notif-welcome-1" |
| type | string | ✅ | "GUEST_WELCOME" |
| title | string | ✅ | "Welcome to StoryVermo" |
| message | string | ✅ | "Start sharing your stories today" |
| cta | string | ❌ | "Get Started" |
| cta_url | string | ✅ | "/signup" |
| emoji | string | ✅ | "🎉" |
| priority | number | ✅ | 1, 2, or 3 |
| dismiss_count | number | ✅ | 0 (no dismiss) or 1+ (allow dismiss) |
| visit_count | number | ❌ | 1 (optional, for tracking) |

## 🎓 How Notifications Work by Visit Count

**Suggested backend logic:**
- Visit 1: Show WELCOME notification (priority 2)
- Visit 3: Show EXPLORE notification (priority 2)
- Visit 5: Show COMMUNITY notification (priority 2)
- Visit 10: Show ENGAGEMENT notification (priority 2)
- Visit 15+: Show BADGES notification (priority 1)

Each visit increments a counter. Frontend handles dismissal persistence.

## 📚 Documentation

Full comprehensive guide: `GUEST_NOTIFICATIONS_IMPLEMENTATION.md`

---

**Status:** ✅ Complete and ready to use
**Last Updated:** November 25, 2025
**Integration Level:** Fully integrated into root layout
