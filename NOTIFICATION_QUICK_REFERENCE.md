# 🔔 Notification Types Quick Reference

## Backend Notification Types (from Django signals)

| Type | Trigger | Points | Recipients | Display |
|------|---------|--------|-----------|---------|
| **LEADERBOARD** | Weekly at Sun 5 PM | - | All users | 📊 Rank badge |
| **ACHIEVEMENT** | Top 3 weekly winners | Bonus | Winners | 🏆 Modal |
| **LIKE** | Story/verse liked | +1 to creator | Creator | ❤️ Bell |
| **COMMENT** | Comment created | +1 to author | Recipient | 💬 Bell |
| **VERSE** | Verse added | +15 to author | Owner+followers | ✨ Bell |
| **STORY** | New story created | +20 to creator | Followers | 📖 Bell |
| **FOLLOW** | User followed | +2 to followed | Followed user | 👤 Bell |
| **MENTION** | @ mentioned | - | Mentioned user | @ Bell |
| **SAVE** | Story saved | +1 to creator | Creator | 💾 Bell |
| **WELCOME** | User created | - | New user | 🎉 Bell |
| **SYSTEM** | Milestone reached | - | User | ⭐ Bell |

## Frontend Detection & Routing

```javascript
// Import utilities
import {
  isLeaderboardNotification,        // → /leaderboard
  isAchievementNotification,        // → /leaderboard
  getNotificationRoute,              // Get route for any notification
  formatNotificationDisplay,        // Format for display
  getNotificationTypeConfig,        // Get icon/color
} from 'lib/leaderboardNotifications';
```

## Component Usage

### Notification Bell (Header)
```jsx
import NotificationBell from 'components/header/NotificationBell';

// Auto-handles all notification types
<NotificationBell />
```

### Full Notifications Page
```jsx
// Path: /notifications
// Shows all notifications with special handling for leaderboard

// Uses NotificationsClient component
```

### Leaderboard Notifications
```jsx
import LeaderboardNotificationDisplay from 'components/LeaderboardNotificationDisplay';

<LeaderboardNotificationDisplay
  notification={notification}
  onMarkAsRead={(id) => {...}}
  onNavigate={(path) => {...}}
/>
```

## Points System (From Backend Signals)

### Engagement Points
```
Story created:          +20 points
Verse created:          +15 points
Verse to others:        +10 bonus points
Comment made:           +1 point
Comment reply:          +1 point (extra)
Like received:          +1 point
Share received:         +10 points (story) / +3 points (verse)
Story saved:            +1 point
New follower:           +2 points
```

### Leaderboard Scoring
```
Monday-Sunday 4:59 PM:  Weekly + Lifetime
Sunday 5 PM-11:59 PM:   Lifetime only
Sunday 5 PM winners:    Finalized score (locked)
```

### Achievement Bonuses
```
#1 Rank:   +50 bonus lifetime points
#2 Rank:   +20 bonus lifetime points
#3 Rank:   +15 bonus lifetime points
#4-10:     +5 bonus lifetime points
```

## Message Examples

### Leaderboard Tiers
```
Rank 1: "🏆 You're the #1 Champion This Week!"
Rank 2: "🥈 Amazing! You're #2 This Week!"
Rank 3: "🥉 Awesome! You're in the Top 3!"
4-10:   "📊 Week Results: You're #[N]!"
11+:    "📊 Weekly Leaderboard Updated!"
```

### Achievement Messages
```
Top 3:     "Week #[N] [YEAR] - [EMOJI] [RANK]!"
Top 10:    "🎖️ Top 10 Bonus Award! You placed #[N]"
Others:    "Great effort this week! Keep engaging!"
```

### Regular Notifications
```
Like:      "[User] liked your [story/verse]"
Comment:   "[User] commented on your story: '[Preview]'"
Verse:     "[User] contributed to your story!"
Story:     "[User] published a new story: '[Title]'"
Follow:    "[User] started following you"
Mention:   "[User] mentioned you in a comment"
Save:      "[User] saved your story '[Title]'"
Welcome:   "Welcome to StoryVermo! [Message]"
Milestone: "Milestone: [N] [Type]! Congratulations!"
```

## Colors & Icons

### Type Colors (Gradients)
```
LEADERBOARD:  cyan-400 to blue-500       📊
ACHIEVEMENT:  yellow-400 to amber-500    🏆
LIKE:         red-400 to pink-500        ❤️
COMMENT:      blue-400 to cyan-500       💬
VERSE:        indigo-400 to purple-500   ✨
STORY:        emerald-400 to teal-500    📖
FOLLOW:       orange-400 to yellow-500   👤
MENTION:      pink-400 to rose-500       @
SAVE:         green-400 to emerald-500   💾
WELCOME:      cyan-400 to blue-500       🎉
SYSTEM:       purple-400 to pink-500     ⭐
```

### Medal Emojis (By Rank)
```
Rank 1:    🏆
Rank 2:    🥈
Rank 3:    🥉
4-10:      🏅
11+:       📈
```

## Files Updated

### Core Utilities
- `lib/leaderboardNotifications.js` - Type detection, formatting, routing

### Components
- `components/header/NotificationBell.js` - Dropdown preview
- `components/LeaderboardNotificationDisplay.js` - Modal display
- `app/notifications/NotificationsClient.js` - Full page

### Data Models (Backend Only)
- `core/models.py` - WeeklyLeaderboard model
- `core/signals.py` - Notification creation logic
- `core/tasks.py` - Scheduled tasks

## Testing Notifications

### Local Testing
```bash
# 1. Start dev server
npm run dev

# 2. Create test notification (Django shell)
python manage.py shell
>>> from api.models import Notification
>>> from django.contrib.auth.models import User
>>> user = User.objects.first()
>>> Notification.objects.create(
...     recipient=user,
...     notification_type='LEADERBOARD',
...     title='Test Leaderboard',
...     message='Test message',
...     rank=1,
...     finalized_score=500
... )

# 3. Check frontend - notification should appear in bell
```

### Production Monitoring
- Check Celery Beat logs: `celery logs -l info`
- Verify notification creation: Check Notification model count
- Monitor WebSocket connections: Check channels logs
- Test user notifications: Create interaction, check notification bell

## Troubleshooting

### Notification not appearing
1. Check backend created notification: `Notification.objects.filter(recipient=user).latest('created_at')`
2. Check notification type: Should match one of types above
3. Check WebSocket connected: Look for connection message in browser console
4. Check notification bell loading: Open DevTools → Network tab

### Wrong icon/color showing
1. Check `notification_type` field value
2. Verify `isLeaderboardNotification()` detection logic
3. Check `getNotificationTypeConfig()` has type mapped
4. Verify notification doesn't match multiple types

### Navigation not working
1. Check `getNotificationRoute()` returns valid path
2. Verify story/verse slugs are correct
3. Check router is working: Try manual navigation
4. Check notification has required fields (story.slug, etc.)

## Extending System

### Add New Notification Type

1. **Backend** (`signals.py`):
```python
@receiver(post_save, sender=YourModel)
def handle_your_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=user,
            notification_type='YOUR_TYPE',
            title='Title',
            message='Message'
        )
        broadcast_notification(notification)
```

2. **Frontend** (`leaderboardNotifications.js`):
```javascript
const notificationTypeConfig = {
    YOUR_TYPE: {
        icon: '🎯',
        defaultGradient: 'from-color-400 to-color-500',
        defaultBg: 'bg-color-500/10',
        defaultBorder: 'border-color-500/30'
    }
}

export const isYourTypeNotification = (n) => 
    n?.notification_type === 'YOUR_TYPE'
```

3. **Update** notification routing, icons, etc.

---

**Last Updated**: November 25, 2025  
**System Status**: ✅ Production Ready
