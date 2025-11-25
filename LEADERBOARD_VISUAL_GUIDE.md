# 🏆 Weekly Leaderboard - Visual Guide & Component Map

## UI Component Locations

### Profile Page (`/[username]`)

```
┌─────────────────────────────────────────────────────────┐
│  [Cover Image]                                          │
├─────────────────────────────────────────────────────────┤
│  [Profile Picture]  [Username]                          │
│                     [Full Name]           [Follow Button]│
│                                                          │
│  📊 Stats: Stories | Followers | Following              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🏆 WEEKLY WINNERS BANNER (if is_finalized === true)    │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ 🏆 #1 Alice  │ 🥈 #2 Bob    │ 🥉 #3 Carol  │        │
│  │ @alice       │ @bob         │ @carol       │        │
│  │ ⚡ 789 pts   │ ⚡ 756 pts   │ ⚡ 742 pts   │        │
│  └──────────────┴──────────────┴──────────────┘        │
│                                                          │
│  👤 YOUR RANK (if viewing own profile)                  │
│  ┌─────────────────────────────────────────┐           │
│  │ #3 • 542 points this week    [Week 48] │           │
│  │ Lifetime: 2,847 points                 │           │
│  │ ████████████░░░░ 85% Position          │           │
│  │ Resets Monday, Nov 25 at 12:00 AM UTC  │           │
│  └─────────────────────────────────────────┘           │
│                                                          │
│  📊 WEEKLY PROGRESS (if viewing own profile)            │
│  ┌─────────────────────────────────────────┐           │
│  │ Mon Tue Wed Thu Fri Sat Sun (Today)     │           │
│  │ ████████████░░░░░░ 5/7 Days Elapsed    │           │
│  │ 🟢 Counting Period (Mon-Sun 4:59pm)    │           │
│  │ Next Reset: Mon, Nov 25 at 12:00 AM    │           │
│  └─────────────────────────────────────────┘           │
│                                                          │
│  🏅 BADGES & ACHIEVEMENTS                              │
│  ┌──────┬──────┬──────┬──────┐                        │
│  │ 🎖️  │ 🎖️  │ 🎖️  │ 🎖️  │                        │
│  │ Badge│ Badge│ Badge│ Badge│                        │
│  └──────┴──────┴──────┴──────┘                        │
│                                                          │
│  Stories | Verses | Contributions | Saved              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Stories Grid]  (3-4 columns responsive)               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Notification Bell (`/components/header/NotificationBell.js`)

```
┌────────────────────────────────────────┐
│ 🔔(5)                                  │ ← Bell icon with unread count
└────────────────────────────────────────┘

When clicked, opens dropdown:

┌─────────────────────────────────────────────┐
│  Notifications                     Clear all│
├─────────────────────────────────────────────┤
│                                             │
│  🏆 🏆 You're the #1 Champion This Week!   │ ← Leaderboard notification
│  You absolutely dominated!                  │
│  Just now                                   │
│  ● (unread)                                │
│                                             │
│  👤 Alice liked your story                 │
│  "Amazing Story"                           │
│  2h ago                                    │
│                                             │
│  ⚡ You received a follower                │
│  @bob started following you                │
│  1d ago                                    │
│                                             │
├─────────────────────────────────────────────┤
│  🔔 View all notifications →               │
└─────────────────────────────────────────────┘
```

### Leaderboard Notification Modal

```
┌─────────────────────────────────────────────┐
│                                             │
│                 🏆 (bouncing)              │
│                                             │
│  🏆 You're the #1 Champion This Week!      │
│  You absolutely dominated!                  │
│  Keep inspiring our community! 🌟          │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  Final Score                          │ │
│  │  ⚡ 789                               │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  You dominated this week! You're our       │
│  #1 Champion. Keep up the amazing work     │
│  and inspire the community!                │
│                                             │
│  ┌──────────────┬──────────────────────┐  │
│  │    Close     │ View Leaderboard →   │  │
│  └──────────────┴──────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Leaderboard Modal (on Profile)

```
┌───────────────────────────────────────────────┐
│  🏆 Leaderboard            Top 10 Users       │
├───────────────────────────────────────────────┤
│                                               │
│  🥇 #1 ★ Alice         ⚡ 789 ✨ 5200        │
│  🥈 #2 ★ Bob           ⚡ 756 ✨ 4800        │
│  🥉 #3 ★ Carol         ⚡ 742 ✨ 4600        │
│  #4   ★ Diana         ⚡ 715 ✨ 4200        │
│  #5   ★ Eve           ⚡ 698 ✨ 3900        │   ← Current user highlighted
│  #6   ★ Frank         ⚡ 678 ✨ 3700        │      with cyan border & ring
│  #7   ★ Grace         ⚡ 654 ✨ 3500        │
│  #8   ★ Henry         ⚡ 632 ✨ 3200        │
│  #9   ★ Ivy           ⚡ 610 ✨ 3000        │
│  #10  ★ Jack          ⚡ 589 ✨ 2800        │
│                                               │
├───────────────────────────────────────────────┤
│           Close                              │
└───────────────────────────────────────────────┘

⚡ = Weekly Score (this week)
✨ = Lifetime Score (all-time)
★ = Current user highlighted
```

---

## Component Hierarchy

```
App
├── Header
│   └── NotificationBell
│       └── [LeaderboardNotificationDisplay] ← New
│           └── LeaderboardNotificationModal
│       └── [Regular Notifications]
│
├── ProfileClient (MODIFIED)
│   ├── WeeklyWinnersBanner (NEW)
│   │   └── SmartImg (profile pics)
│   ├── UserRankCard (NEW)
│   │   └── Progress bar
│   ├── WeeklyProgressBar (NEW)
│   │   └── Day markers
│   ├── Badges Section (existing)
│   ├── Stats Section (existing)
│   ├── Tabs (existing)
│   └── Leaderboard Modal (ENHANCED)
│       └── User list with new scoring display
│
└── Other Components
    └── ...
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  Backend (API)  │
│  Django/DRF     │
└────────┬────────┘
         │
         │ GET /api/profiles/{username}/
         │ Returns:
         │ - rank: 3
         │ - weekly_score: 542
         │ - lifetime_score: 2847
         │ - is_finalized: true
         │ - week_number: 48
         │ - year: 2025
         │ - leaderboard_top: [...]
         │
         ▼
┌─────────────────────────┐
│  Frontend State         │
│  (React Hook State)     │
└────────┬────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────────┐      ┌──────────────────────┐
│ ProfileClient Props  │      │ NotificationBell     │
│ - user (full obj)    │      │ Props                │
│ - currentUser        │      │ - notifications[]    │
│ - username           │      │ - onMarkAsRead()     │
└────────┬─────────────┘      └──────────┬───────────┘
         │                               │
         │                               │ Uses utility:
         │                               │ isLeaderboardNotification()
         │                               │ formatLeaderboardDisplay()
         │                               │
         ├──────────────────┬──────────┬─┴────────────────┐
         │                  │          │                  │
         ▼                  ▼          ▼                  ▼
    Weekly         User          Weekly        Leaderboard
    Winners        Rank          Progress      Notification
    Banner         Card          Bar           Display
    
    (conditionally rendered)
    
         └────────────────────────────────────┬────────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │  User Interface  │
                                     │  (Rendered HTML) │
                                     └──────────────────┘
```

---

## Notification Message Templates

### #1 Champion (Gold)
```
Icon: 🏆
Title: "🏆 You're the #1 Champion This Week!"
Message: "You absolutely dominated! Keep inspiring our community! 🌟"
Color: from-yellow-400 to-amber-500
```

### #2 Silver (Gray)
```
Icon: 🥈
Title: "🥈 Amazing! You're #2 This Week!"
Message: "So close to the top - one more push! 💪"
Color: from-gray-300 to-slate-400
```

### #3 Bronze (Orange)
```
Icon: 🥉
Title: "🥉 Awesome! You're in the Top 3!"
Message: "You're among our best creators! Keep shining! ⭐"
Color: from-orange-400 to-amber-600
```

### #4-10 (Cyan)
```
Icon: 🏅
Title: "📊 Week Results: You're #{rank}!"
Message: "Keep creating great content! ✨"
Color: from-cyan-400 to-blue-500
```

### #11+ (Purple)
```
Icon: 📈
Title: "📊 Weekly Leaderboard Updated!"
Message: "Keep engaging to climb the leaderboard! 🚀"
Color: from-purple-400 to-pink-500
```

---

## Responsive Design Breakdown

### Mobile (< 768px)
```
WeeklyWinnersBanner:  1 column (stacked)
UserRankCard:         Full width
WeeklyProgressBar:    Full width
Leaderboard Modal:    Full width with bottom padding
```

### Tablet (768px - 1024px)
```
WeeklyWinnersBanner:  2-3 columns
UserRankCard:         Full width
WeeklyProgressBar:    Full width
Leaderboard Modal:    Centered with max-width
```

### Desktop (> 1024px)
```
WeeklyWinnersBanner:  3 columns side-by-side
UserRankCard:         Card in content area
WeeklyProgressBar:    Card in content area
Leaderboard Modal:    Centered modal 420px wide
```

---

## Weekly Timeline

```
Monday 12:00 AM UTC
↓
- reset_weekly_leaderboard_scores() runs
- All weekly_score = 0
- is_finalized = False
- week_number incremented
↓

Monday - Sunday 4:59 PM UTC
↓
- Users gain engagement points
- Points count to weekly_score + lifetime_score
- Leaderboard updates in real-time
- WeeklyWinnersBanner hidden (is_finalized = false)
↓

Sunday 5:00 PM UTC
↓
- send_weekly_leaderboard_notifications() runs
- Scores finalized (frozen)
- Notifications sent to all users
- Personalized messages by rank
- WeeklyWinnersBanner visible (is_finalized = true)
↓

Sunday 5:00 PM - 11:59 PM UTC
↓
- Off-hours period
- Points only count to lifetime_score
- weekly_score stays frozen
- User sees amber/yellow progress bar
↓

Monday 12:00 AM UTC (repeats)
```

---

## Score Display Legend

```
⚡ = Weekly Score (this week only, resets Monday)
✨ = Lifetime Score (accumulates forever)
🏆 = Finalized Score (frozen snapshot at Sunday 5pm for winners)

Example Card:
┌─────────────────────┐
│ @alice              │
│ ⚡ 789 ✨ 5200     │
│                     │
│ Weekly: 789 pts     │
│ Lifetime: 5200 pts  │
└─────────────────────┘
```

---

## File Structure with Line Counts

```
Components (1,200+ lines total)

WeeklyWinnersBanner.js          142 lines
├── SmartImg helper               35 lines
├── Animated winners list         80 lines
├── Gradient backgrounds          20 lines
└── Animations                     7 lines

UserRankCard.js                 188 lines
├── Rank calculation             20 lines
├── Days calculation             30 lines
├── Score display                60 lines
├── Progress bar                 40 lines
└── Styling                      38 lines

WeeklyProgressBar.js            171 lines
├── Week calculation             40 lines
├── Progress logic               30 lines
├── Day markers                  35 lines
├── Status indicator             25 lines
└── Styling                      41 lines

LeaderboardNotificationDisplay.js 247 lines
├── Compact notification         80 lines
├── Full modal                  120 lines
├── Animations                  30 lines
└── Styling                     17 lines

leaderboardNotifications.js (Utility) 50 lines
├── Message formatting          25 lines
├── Detection logic              15 lines
└── Display helpers              10 lines

Modified Files:

ProfileClient.js                (1177 lines)
├── Imports (3 lines added)      3 lines
├── Component section           ~25 lines
├── Leaderboard modal          ~70 lines
└── Total changes              ~98 lines

NotificationBell.js             (207 lines)
├── Imports (2 lines added)      2 lines
├── Notification rendering      ~40 lines
└── Total changes              ~42 lines
```

---

## Performance Considerations

```
Caching Strategy:
├── Leaderboard data: Cache during active period (5-15 min)
├── Profile page: Cache 10 minutes
├── Notification list: Cache 2 minutes
└── User data: Cache until manual refresh

Re-render Triggers:
├── User state change
├── Notification update
├── Time-based update (days left in week)
└── Follow/unfollow actions

Optimizations:
├── Memoization of components
├── Lazy loading of images
├── Debounced scroll handlers
└── Efficient re-renders with keys
```

---

## Browser Compatibility

```
✅ Chrome/Edge (v90+)
✅ Firefox (v88+)
✅ Safari (v14+)
✅ Mobile browsers (iOS 14+, Android 10+)
✅ Responsive design (all screen sizes)
```

---

## Accessibility Features

```
✅ ARIA labels on interactive elements
✅ Keyboard navigation support
✅ Color not sole indicator (icons + text)
✅ Sufficient color contrast
✅ Readable font sizes
✅ Touch targets 44px minimum
✅ Screen reader friendly
✅ Focus indicators visible
```

---

## Security Considerations

```
✅ No sensitive data in frontend
✅ Server-side rank calculation (can't be spoofed)
✅ Leaderboard data readonly
✅ Notifications tied to authenticated user
✅ API token validation required
```

---

**Last Updated:** November 24, 2025
**Version:** 1.0 - Complete
**Status:** Ready for Testing ✅
