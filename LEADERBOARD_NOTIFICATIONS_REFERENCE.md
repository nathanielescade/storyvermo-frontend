# Weekly Leaderboard Notifications Reference

## Backend Notification Format

When the backend sends leaderboard notifications (every Sunday 5:00 PM UTC), they arrive with this structure:

```json
{
  "id": 12345,
  "recipient_id": 1,
  "notification_type": "LEADERBOARD",
  "type": "LEADERBOARD",
  "rank": 1,
  "position": 1,
  "finalized_score": 789,
  "score": 789,
  "message": "🏆 You're the #1 Champion This Week!",
  "title": "You absolutely dominated! Keep inspiring our community! 🌟 Final score: 789",
  "is_read": false,
  "created_at": "2025-11-24T17:00:00Z",
  "time_ago": "Just now"
}
```

## Notification Detection

The `isLeaderboardNotification()` utility checks:
1. `notification_type === 'LEADERBOARD'`
2. `type === 'LEADERBOARD'`
3. Message contains keywords like "Champion" or "Leaderboard"

## Display Logic

### Rank #1 (Champion)
```
Icon: 🏆
Title: "🏆 You're the #1 Champion This Week!"
Message: "You absolutely dominated! Keep inspiring our community! 🌟 Final score: {score}"
Color: from-yellow-400 to-amber-500
Extra: "You dominated this week! Keep up the amazing work and inspire the community!"
```

### Rank #2 (Silver)
```
Icon: 🥈
Title: "🥈 Amazing! You're #2 This Week!"
Message: "So close to the top - one more push! 💪 Final score: {score}"
Color: from-gray-300 to-slate-400
Extra: "Incredible performance! You're so close to the top."
```

### Rank #3 (Bronze)
```
Icon: 🥉
Title: "🥉 Awesome! You're in the Top 3!"
Message: "You're among our best creators! Keep shining! ⭐ Final score: {score}"
Color: from-orange-400 to-amber-600
Extra: "Outstanding effort! You're in the top 3 best creators."
```

### Rank #4-10 (Top 10)
```
Icon: 🏅
Title: "📊 Week Results: You're #{position}!"
Message: "Keep creating great content! ✨ Final score: {score}"
Color: from-cyan-400 to-blue-500
Extra: None
```

### Rank #11+ (Leaderboard)
```
Icon: 📈
Title: "📊 Weekly Leaderboard Updated!"
Message: "Keep engaging to climb the leaderboard! 🚀 Your score: {score}"
Color: from-purple-400 to-pink-500
Extra: None
```

## Notification Locations

### 1. Bell Icon Dropdown
- Compact 1-line preview
- Medal emoji badge
- Color-coded background
- Time ago indicator
- Click to expand modal

### 2. Full Screen Modal
- Large animated medal emoji (bouncing)
- Rank display with gradient text
- Score prominently shown
- Personalized encouragement message
- Action buttons:
  - "Close" - Dismiss modal
  - "View Leaderboard →" - Navigate to `/leaderboard`

### 3. Notifications Page
- Full card with medal badge
- Animated entrance
- Click to see details
- Expandable for more info

## Unread Indicator

- Cyan dot shown on right side if `is_read === false`
- Dim background for read notifications
- Click any notification to mark as read

## Handling Missing Data

If notification is missing `rank` or `score`:
```javascript
const rank = notification.rank || notification.position;
const score = notification.finalized_score || notification.score;

// Defaults to generic leaderboard message if rank missing
if (!rank) {
  return {
    title: "📊 Weekly Leaderboard Updated!",
    message: "Keep engaging to climb the leaderboard! 🚀"
  };
}
```

## Integration with Celery

The backend creates these notifications using the Celery task:

```python
# Runs every Sunday 5:00 PM UTC
@shared_task
def send_weekly_leaderboard_notifications():
    # Get top 3 users
    top_3 = WeeklyLeaderboard.objects.order_by('-finalized_score')[:3]
    
    # Send notification to EACH user
    for user in User.objects.all():
        rank = get_user_rank(user)
        finalized_score = get_finalized_score(user)
        
        message = get_leaderboard_message(rank, finalized_score)
        
        Notification.objects.create(
            recipient=user,
            notification_type='LEADERBOARD',
            rank=rank,
            finalized_score=finalized_score,
            message=message['title'],
            title=message['message']
        )
```

## Frontend Usage

```javascript
// Import the utility
import { 
  isLeaderboardNotification,
  formatLeaderboardNotificationDisplay 
} from '@/lib/leaderboardNotifications';

// Check if notification is leaderboard-related
if (isLeaderboardNotification(notification)) {
  // Format for display
  const displayData = formatLeaderboardNotificationDisplay(notification);
  
  // Display the medal emoji, title, and message
  console.log(displayData.icon);        // "🏆"
  console.log(displayData.title);       // "🏆 You're the #1 Champion This Week!"
  console.log(displayData.subtitle);    // Full message
  console.log(displayData.rank);        // 1
  console.log(displayData.score);       // 789
  console.log(displayData.isAchievement); // true (rank <= 3)
}
```

## Key Features

✅ **Personalized Messages** - Based on exact rank position
✅ **Medal Emojis** - Visual celebration for achievements
✅ **Animated Display** - Medal bounces in modal
✅ **Gradient Colors** - Unique color for each rank
✅ **Score Display** - Shows finalized score prominently
✅ **Extra Encouragement** - Special messages for top 3
✅ **Navigation** - Direct link to leaderboard view
✅ **Mobile Responsive** - Works on all screen sizes
✅ **Dark Theme** - Matches existing UI design
✅ **Accessibility** - Proper ARIA labels and keyboard navigation

## Testing Scenarios

```javascript
// Test #1: User ranks #1
{
  notification_type: 'LEADERBOARD',
  rank: 1,
  finalized_score: 789,
  message: "🏆 You're the #1 Champion This Week!"
}
// Expected: Gold gradient, medal emoji bounces, "Champion" message

// Test #2: User ranks #5
{
  notification_type: 'LEADERBOARD',
  rank: 5,
  finalized_score: 450,
  message: "📊 Week Results: You're #5!"
}
// Expected: Cyan gradient, trophy emoji, generic message

// Test #3: User ranks #25
{
  notification_type: 'LEADERBOARD',
  rank: 25,
  finalized_score: 120,
  message: "📊 Weekly Leaderboard Updated!"
}
// Expected: Purple gradient, chart emoji, climbing message
```

---

**Last Updated:** November 24, 2025
