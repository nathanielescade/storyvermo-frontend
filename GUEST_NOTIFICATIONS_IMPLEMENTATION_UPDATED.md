# Guest Notifications Implementation - Updated (Notification Bell Integration)

**Date Updated:** November 25, 2025  
**Architecture:** Guest notifications are now integrated into the existing `NotificationBell` component in the header, visible to all users (authenticated and unauthenticated).

## Overview

Guest notifications are system notifications displayed to unauthenticated users via the notification bell dropdown in the header. Unlike separate modal/banner components, guest notifications now coexist with authenticated user notifications in a unified UI.

**Key Changes from Previous Architecture:**
- ❌ **Removed:** Separate `GuestNotificationBanner` component
- ❌ **Removed:** Separate `GuestNotificationModal` component  
- ❌ **Removed:** `GuestNotificationContainer` orchestrator from layout
- ✅ **Integrated:** Guest notifications into existing `NotificationBell` component
- ✅ **Result:** All users see the same notification bell UI

## Architecture

### Component Structure

```
Header.js
├── NotificationBell (renders for ALL users)
│   ├── Shows unread count badge
│   ├── Displays dropdown preview (first 5 notifications)
│   ├── Handles guest notifications fetching via useGuestNotifications hook
│   └── Merges guest + authenticated notifications
│
└── [unauthenticated users]
    └── See guest notifications in the bell dropdown
    
[authenticated users]
└── See authenticated notifications + any guest notifications
```

### Data Flow

1. **Guest User Opens Page**
   - Header renders with NotificationBell (always visible)
   - NotificationBell calls `useGuestNotifications()` hook
   - Hook fetches from `/api/notifications/guest_notifications/` (no auth required)
   - Guest notification appears in bell dropdown

2. **Guest Dismisses Notification**
   - Guest clicks dismiss button on notification
   - Dismissal stored in sessionStorage (persists during session)
   - Dismissed notification filtered out of view

3. **Guest Clicks CTA**
   - Guest clicks notification text or button
   - Analytics event tracked
   - User navigated to CTA URL (typically sign up/login)

## Hook API: `useGuestNotifications()`

**Location:** `hooks/useGuestNotifications.js`

```javascript
const {
  notification,        // Current guest notification or null
  visitCount,          // Number of visits (from session storage)
  isAuthenticated,     // Whether user is authenticated
  isLoading,           // Fetching in progress
  error,               // Error object or null
  dismissNotification, // Function to dismiss a notification
  trackNotificationShown,  // Function to track impression
  trackCTAClicked      // Function to track CTA interaction
} = useGuestNotifications();
```

### Behavior

- **Fetches on mount** from `GET /api/notifications/guest_notifications/`
- **Response format:**
  ```json
  {
    "guest_notifications": [
      {
        "id": "guest-notif-1",
        "type": "GUEST_PROMO",
        "emoji": "🎉",
        "title": "Join StoryVermo",
        "message": "Create and share your stories",
        "cta_url": "/signup",
        "priority": 2,
        "dismiss_count": 3,
        "created_at": "2025-11-25T10:00:00Z"
      }
    ],
    "visit_count": 5,
    "is_authenticated": false
  }
  ```

- **Guest notification dismissal:** Stored in `sessionStorage['dismissed_guest_notifs']`
- **Analytics tracking:** Events sent to Google Analytics tag manager

## Integration Points

### 1. Header.js - NotificationBell Always Visible

**File:** `src/app/components/Header.js`

```javascript
// NotificationBell renders for ALL users
{mounted && (
  <NotificationBell />
)}
```

Previously: `{mounted && isAuthenticated && <NotificationBell />}`

### 2. NotificationBell.js - Fetch & Merge

**File:** `src/app/components/header/NotificationBell.js`

```javascript
import { useGuestNotifications } from '../../../../hooks/useGuestNotifications';

export function NotificationBell() {
  const { 
    notification: guestNotification, 
    isAuthenticated,
    dismissNotification: dismissGuestNotification
  } = useGuestNotifications();

  // In useEffect for notification fetching:
  // If guest user with guest notification, prepend to authenticated list
  if (!isAuthenticated && guestNotification) {
    const combined = [guestNotification, ...notificationsList];
    setNotificationsPreview(combined);
  }
  
  // In unread count calculation:
  // Include guest notification count if present
  const guestNotifUnread = guestNotification?.dismiss_count > 0 ? 1 : 0;
  const unreadCount = authNotificationsUnread + guestNotifUnread;
}
```

### 3. NotificationsClient.js - Full Page View

**File:** `src/app/notifications/NotificationsClient.js`

```javascript
import { useGuestNotifications } from '../../../hooks/useGuestNotifications';

export function NotificationsClient() {
  const { 
    notification: guestNotification,
    isAuthenticated
  } = useGuestNotifications();

  // In fetchNotifications:
  if (!isAuthenticated && guestNotification?.dismiss_count > 0) {
    normalized = [guestNotification, ...normalizedAuthNotifications];
  }
}
```

## Rendering Guest Notifications

Guest notifications are displayed with:
- **Icon/Emoji** (e.g., 🎉, 👋, 💡)
- **Title** (e.g., "Join StoryVermo")
- **Message preview** (e.g., "Create and share your stories")
- **Dismiss button** (×) if available
- **Click handler** to navigate to CTA URL

### Example in NotificationBell Dropdown

```
🎉 Join StoryVermo                          ×
Create and share your stories

(Clicking navigates to /signup)
```

## Migration from Old Architecture

### Files Deleted
- ✅ `src/app/components/GuestNotificationBanner.js`
- ✅ `src/app/components/GuestNotificationModal.js`
- ✅ `src/app/components/GuestNotificationContainer.js`

### Files Updated
- ✅ `src/app/layout.js` - Removed GuestNotificationContainer import and usage
- ✅ `src/app/components/Header.js` - Removed isAuthenticated check on NotificationBell
- ✅ `src/app/components/header/NotificationBell.js` - Added useGuestNotifications hook
- ✅ `src/app/notifications/NotificationsClient.js` - Added guest notification merging

### Files Unchanged
- ✅ `hooks/useGuestNotifications.js` - Still used, now integrated into bell
- ✅ `lib/guestNotificationUtils.js` - Available for utility functions
- ✅ API endpoint `/api/notifications/guest_notifications/` - No changes needed

## Testing Checklist

- [ ] Guest user sees notification bell in header
- [ ] Bell shows unread count badge for guest notifications
- [ ] Guest notification appears in dropdown preview
- [ ] Guest can dismiss notification
- [ ] Guest notification persists in sessionStorage until dismissed
- [ ] Dismissed guest notification doesn't reappear (session)
- [ ] Guest CTA click triggers navigation
- [ ] Analytics events tracked for impression and CTA click
- [ ] Authenticated users see their notifications normally
- [ ] No console errors on guest user visit
- [ ] No build warnings related to missing components

## Troubleshooting

### Guest notification not appearing in bell
1. Check `/api/notifications/guest_notifications/` returns data
2. Verify `useGuestNotifications()` is called in NotificationBell
3. Check browser sessionStorage: `localStorage.getItem('dismissed_guest_notifs')`
4. Check browser console for fetch errors

### Dismissal not persisting
1. Verify sessionStorage is enabled
2. Check `dismissGuestNotification()` is called on button click
3. Verify `notificationsPreview` state is updated after dismissal

### Guest notifications not showing in full notifications page
1. Verify `useGuestNotifications()` is called in NotificationsClient
2. Ensure guest notification is prepended to authenticated list
3. Check notification rendering includes guest notification type handling

## Future Enhancements

- Add scheduling API for guest notifications (time-based display)
- Support multiple guest notifications (not just one per session)
- Add rich media support (images, video embeds)
- Implement A/B testing for different notification messages
- Add analytics dashboard for notification performance

---

**Last Updated:** November 25, 2025
