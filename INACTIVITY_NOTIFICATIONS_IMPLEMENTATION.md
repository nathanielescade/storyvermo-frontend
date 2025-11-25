# Inactivity Notifications Implementation

## Overview
Added frontend support for inactivity reminder notifications sent by the Django backend task `send_inactivity_reminders_task()`. These notifications remind users to create stories or verses at various inactivity intervals.

## Changes Made

### 1. **lib/leaderboardNotifications.js**
Added comprehensive support for inactivity notification types:

#### New Detection Function
```javascript
export const isInactivityNotification = (notification) => {
  if (!notification) return false;
  const type = notification?.notification_type || notification?.type || '';
  return type.startsWith('INACTIVITY_');
};
```

#### New Notification Type Configurations
Added 5 inactivity notification types to the `notificationTypeConfig` object:

| Type | Threshold | Icon | Gradient | Description |
|------|-----------|------|----------|-------------|
| `INACTIVITY_2` | 2 days | 👋 | blue-400 to cyan-500 | First reminder - "we miss you" |
| `INACTIVITY_5` | 5 days | ✨ | purple-400 to pink-500 | Second reminder - "time to create" |
| `INACTIVITY_10` | 10 days | ✍️ | yellow-400 to amber-500 | Third reminder - "your magic needed" |
| `INACTIVITY_15` | 15 days | 💔 | red-400 to pink-500 | Fourth reminder - "we miss you" |
| `INACTIVITY_30` | 30 days | 📣 | orange-400 to red-500 | Final reminder - "come back" |

### 2. **src/app/components/header/NotificationBell.js**
Updated notification bell dropdown to properly display inactivity notifications:

- Added `isInactivityNotification` import from leaderboardNotifications
- Added special handling in the notification preview list to detect and display inactivity notifications
- Inactivity notifications show:
  - Appropriate emoji icon based on threshold
  - Full notification title
  - Unread indicator
  - Navigation to home page (/) when clicked

### 3. **src/app/notifications/NotificationsClient.js**
Updated full notifications page to handle inactivity notifications:

- Added `isInactivityNotification` import from leaderboardNotifications
- Added special rendering block for inactivity notifications before regular notifications
- Inactivity notification display includes:
  - Large emoji icon with blue-to-cyan gradient
  - Notification title and message
  - "Create Story" action button
  - Time ago indicator
  - Unread indicator (blue dot)
  - Smooth hover effects and transitions

## Notification Flow

### Backend → Frontend
1. Django task `send_inactivity_reminders_task()` creates notification with:
   - `notification_type`: `INACTIVITY_2`, `INACTIVITY_5`, `INACTIVITY_10`, `INACTIVITY_15`, or `INACTIVITY_30`
   - `title`: Formatted with emoji and threshold message
   - `message`: Personalized message with user's first name or username
   - `recipient`: The inactive user

2. Frontend receives notification via `/api/notifications/` endpoint

### Frontend Display
1. **Notification Bell (Header)**
   - Shows unread count badge
   - Displays last 5 notifications in preview
   - Inactivity notifications show with emoji and title

2. **Notifications Page**
   - Full list of all notifications
   - Inactivity notifications highlighted with special styling
   - "Create Story" button for quick action
   - Mark as read on click

## Styling Details

### Inactivity Notification Card (Notifications Page)
```
- Background: slate-900/60 with backdrop blur
- Border: left border in cyan-500 when unread
- Padding: p-4
- Rounded: rounded-2xl
- Hover: hover:bg-slate-800/50 transition
```

### Icon Container
```
- Size: w-10 h-10 rounded-full
- Gradient: from-blue-500 to-cyan-500
- Icon Size: text-lg
- Text Color: text-white
```

### Action Button
```
- Text: "Create Story"
- Styling: gradient-to-r from-cyan-500 to-blue-500
- Size: text-xs px-3 py-1.5
- Hover: hover:opacity-90
- Rounded: rounded-lg
```

## Backend Requirements

The backend Django task must create notifications with the following structure:

```python
notification = Notification.objects.create(
    recipient=user,
    notification_type=f'INACTIVITY_{days_threshold}',  # e.g., 'INACTIVITY_2'
    title=f"{emoji} {message_title}",  # e.g., "👋 Hey, we miss you!"
    message=f"Hi {user_name}, {reminder_message}",  # Personalized message
)
```

## Testing Checklist

- [ ] Inactivity notifications appear in notification bell dropdown
- [ ] Inactivity notifications appear in full notifications page
- [ ] Clicking notification redirects to home page
- [ ] "Create Story" button on notifications page works
- [ ] Unread indicators show correctly
- [ ] Mark as read functionality works
- [ ] All 5 threshold types (2, 5, 10, 15, 30 days) display correctly
- [ ] Emoji icons match the configured types
- [ ] Gradient colors apply correctly

## Files Modified
1. `lib/leaderboardNotifications.js` - Added inactivity detection and configs
2. `src/app/components/header/NotificationBell.js` - Added inactivity rendering to dropdown
3. `src/app/notifications/NotificationsClient.js` - Added inactivity rendering to full page

## Notes
- Inactivity notifications are automatically distinguished from other notification types via the `isInactivityNotification()` function
- The system is flexible and can easily be extended with additional threshold types in the future
- Emoji selection matches the motivational messaging from the backend task
- Colors progress from "gentle reminders" (blue) to "urgent" (red/orange) as inactivity increases
