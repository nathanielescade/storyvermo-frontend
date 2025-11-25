# Guest Notification System - Architecture Diagrams

## 📐 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Root Layout (layout.js)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              GuestNotificationContainer                  │   │
│  │  (Smart orchestrator - handles priority routing)        │   │
│  │                                                          │   │
│  │  ┌─────────────────┐           ┌─────────────────┐     │   │
│  │  │ useGuest        │  ────────│ Decision Logic  │     │   │
│  │  │ Notifications   │           │ (Priority 1?)   │     │   │
│  │  │ (Hook)          │           └─────────────────┘     │   │
│  │  │                 │                    │              │   │
│  │  │ Returns:        │                    ├─→ YES ─────┐ │   │
│  │  │ - notification  │                    │             │ │   │
│  │  │ - visitCount    │                    └─→ NO      │ │   │
│  │  │ - isAuth        │                        |        │ │   │
│  │  │ - isLoading     │                        |        │ │   │
│  │  │ - dismiss()     │                        |        │ │   │
│  │  └─────────────────┘                        ▼        ▼ │   │
│  │                                    ┌──────────────────────┐ │
│  │                                    │  GuestNotification   │ │
│  │                                    │     Banner           │ │
│  │                                    │ (Priority 2-3)       │ │
│  │                                    └──────────────────────┘ │
│  │                                       │  │                  │
│  │                              Dismiss  │  │ CTA Clicked      │
│  │                                 ▲     │  │ ▲                │
│  │                                 │     │  │ │                │
│  │                                 └─────┴──┴─┘                │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  GuestNotification Modal (Priority 1)           │  │   │
│  │  │  - Centered, full-screen                        │  │   │
│  │  │  - Dark gradient, prominent                     │  │   │
│  │  │  - Cannot auto-dismiss                          │  │   │
│  │  │  - Prevents scroll                              │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │    Sidebar      │    │   GlobalShell   │                    │
│  │                 │    │   (Header)      │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Main Content                         │  │
│  │                   {children}                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

```
┌──────────────┐
│  Page Load   │
│  (Guest)     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ GuestNotificationContainer   │
│ mounts                       │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ useGuestNotifications        │
│ hook executes                │
└──────┬───────────────────────┘
       │
       ▼
  ┌────────────────────────────┐
  │ Check sessionStorage for   │
  │ dismissed notifications    │
  └────────┬───────────────────┘
           │
           ▼
  ┌────────────────────────────┐
  │ Fetch API:                 │
  │ /api/notifications/        │
  │ guest_notifications/       │
  └────┬───────────────────────┘
       │
       ├─► Network Error ──────────────────────┐
       │                                       │
       ▼                                       ▼
  ┌────────────────────────────┐      ┌─────────────────┐
  │ Response received          │      │ Silent fail     │
  │ - guest_notifications[]    │      │ Log error only  │
  │ - visit_count              │      └─────────────────┘
  │ - is_authenticated         │
  └────┬───────────────────────┘
       │
       ▼
  ┌────────────────────────────┐
  │ Check: isAuthenticated?    │
  │                            │
  ├─► YES ──► Return null     │
  │                            │
  └─► NO ──┬──────────────────┘
           │
           ▼
  ┌────────────────────────────┐
  │ Filter dismissed from list │
  │ Sort by priority           │
  │ Select first remaining     │
  └────┬───────────────────────┘
       │
       ▼
  ┌────────────────────────────┐
  │ Check notification priority│
  │                            │
  ├─► Priority 1 ──► Modal    │
  │                            │
  └─► Priority 2+ ─► Banner   │
       │
       ▼
  ┌────────────────────────────┐
  │ Render component           │
  │ Track 'shown' event        │
  └────┬───────────────────────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
  ┌──────────────┐           ┌──────────────┐
  │ User clicks  │           │ Auto-dismiss │
  │ CTA / Dismiss│           │ (8s timeout) │
  └──────┬───────┘           └──────┬───────┘
         │                          │
         ├─► CTA                    │
         │   - Track event          │
         │   - Navigate to URL      │
         │                          │
         └─► Dismiss               │
             - Track event          │
             - Store in ssStorage   │
             - Update state         │
             - Hide component       │
             - Same session: hidden
             - New session: shown
```

## 📱 Responsive Layout Diagram

```
MOBILE (< 640px)
┌──────────────────────────────┐
│  ┌────────────────────────┐  │
│  │ ├─ 👋 Welcome!        │  │
│  │ ├─ Start sharing      │  │
│  │ │                     │  │
│  │ ├─ [Get Started] [X]  │  │
│  │ └─ Visit #1           │  │
│  └────────────────────────┘  │
│                              │
│ Full width: 320-480px        │
│ Top padding: 16px            │
│ Side padding: 16px           │
└──────────────────────────────┘

TABLET (640px - 1024px)
┌───────────────────────────────┐
│                               │
│  ┌────────────────────────┐   │
│  │ ├─ 👋 Welcome!        │   │
│  │ ├─ Start sharing      │   │
│  │ │                     │   │
│  │ ├─ [Get Started] [X]  │   │
│  │ └─ Visit #1           │   │
│  └────────────────────────┘   │
│                               │
│ Same as mobile               │
│ (banner takes 90% width)     │
└───────────────────────────────┘

DESKTOP (> 1024px)
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌─────────────────────────────────┐             │
│  │ ├─ 👋 Welcome to StoryVermo!   │             │
│  │ ├─ Start sharing your stories   │             │
│  │ │                               │             │
│  │ ├─ [Get Started] [X]            │             │
│  │ └─ Visit #1                     │             │
│  └─────────────────────────────────┘             │
│         Max-width: 500px                         │
│         Centered at top                          │
│                                                  │
└──────────────────────────────────────────────────┘

MODAL (All sizes)
┌──────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░                                              ░ │
│ ░      ┌────────────────────────────────┐     ░ │
│ ░      │ [X]                            │     ░ │
│ ░      │                                │     ░ │
│ ░      │        🔔                      │     ░ │
│ ░      │                                │     ░ │
│ ░      │  Important Announcement       │     ░ │
│ ░      │                                │     ░ │
│ ░      │  This is an important update  │     ░ │
│ ░      │                                │     ░ │
│ ░      │  [Read More] [Maybe Later]   │     ░ │
│ ░      │                                │     ░ │
│ ░      └────────────────────────────────┘     ░ │
│ ░                                              ░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                  │
│ - Centered on screen                           │
│ - Max-width: 500px                             │
│ - Backdrop blur: 100%                          │
│ - Z-index: 50                                  │
└──────────────────────────────────────────────────┘
```

## 🎨 Color Priority Diagram

```
PRIORITY 1 (High) - MODAL
┌─────────────────────────────────────┐
│ Gradient: red to pink               │
│ Shadow: red glow                    │
│ ┌───────────────────────────────┐   │
│ │ 🔴 Red-500 ────→ Pink-600    │   │
│ │ (#ef4444)        (#ec4899)   │   │
│ │ Shadow: shadow-red-500/50    │   │
│ └───────────────────────────────┘   │
│                                     │
│ Usage: Critical notifications       │
│ Auto-dismiss: No                    │
│ Can dismiss: No                     │
└─────────────────────────────────────┘

PRIORITY 2 (Medium) - BANNER
┌─────────────────────────────────────┐
│ Gradient: purple to indigo          │
│ Shadow: purple glow                 │
│ ┌───────────────────────────────┐   │
│ │ 🟣 Purple-500 ──→ Indigo-600 │   │
│ │ (#a855f7)       (#4f46e5)    │   │
│ │ Shadow: shadow-purple-500/40 │   │
│ └───────────────────────────────┘   │
│                                     │
│ Usage: General notifications        │
│ Auto-dismiss: No                    │
│ Can dismiss: Yes                    │
└─────────────────────────────────────┘

PRIORITY 3+ (Low) - BANNER
┌─────────────────────────────────────┐
│ Gradient: blue to cyan              │
│ Shadow: blue glow                   │
│ ┌───────────────────────────────┐   │
│ │ 🔵 Blue-500 ────→ Cyan-600   │   │
│ │ (#3b82f6)        (#0891b2)    │   │
│ │ Shadow: shadow-blue-500/30    │   │
│ └───────────────────────────────┘   │
│                                     │
│ Usage: Low-priority tips            │
│ Auto-dismiss: Yes (8s)              │
│ Can dismiss: Yes                    │
└─────────────────────────────────────┘
```

## 🧠 State Management Diagram

```
┌────────────────────────────────────────────────────┐
│              React Hook State                      │
│                                                    │
│  const [notification, setNotification] = null    │
│  const [visitCount, setVisitCount] = 0           │
│  const [isAuthenticated, setIsAuthenticated] = F  │
│  const [isLoading, setIsLoading] = true          │
│  const [error, setError] = null                  │
│  const [dismissed, setDismissed] = Set()         │
│                                                    │
└────┬────────────────────────────────────────────────┘
     │
     │ PERSISTED IN:
     │
     ├─→ ┌────────────────────────────┐
     │   │ SessionStorage             │
     │   │ (Same session only)        │
     │   │                            │
     │   │ Key: dismissedGuestNotif.. │
     │   │ Value: ["notif-1", ...]  │
     │   │                            │
     │   │ Cleared when: User clears  │
     │   │ browser cache              │
     │   └────────────────────────────┘
     │
     └─→ ┌────────────────────────────┐
         │ LocalStorage               │
         │ (Persistent)               │
         │                            │
         │ Key: guestVisitCount       │
         │ Value: 15                  │
         │                            │
         │ Cleared when: User clears  │
         │ browser data               │
         └────────────────────────────┘

LIFETIME:
Page Load → Fetch API → Set State → Display Component
    ↓
   User Interaction (dismiss/CTA) → Update State → Persist → Hide Component
    ↓
Page Refresh (same session) → Read SessionStorage → Skip dismissed → Show only new
    ↓
New Session (cleared cache) → Reset storage → Fetch new notifications
```

## 🔌 API Integration Diagram

```
Frontend (Next.js)
│
└─── [Guest Page Load] ──────┐
                             │
                             ▼
                    ┌────────────────────────┐
                    │ Hook: useGuest         │
                    │ Notifications          │
                    │                        │
                    │ fetch('/api/...)       │
                    └────────┬───────────────┘
                             │
                    HTTP GET Request
                             │
                             ▼
Backend API (Django)
│
├─── /api/notifications/guest_notifications/ ─┐
│    (No auth required)                        │
│                                             │
│    Authentication Check:                    │
│    ├─ If authenticated → empty list         │
│    └─ If guest → return notifications       │
│                                             │
│    Generate Response:                       │
│    ├─ Query active guest notifications     │
│    ├─ Get current visit count              │
│    ├─ Filter by visit count threshold      │
│    ├─ Sort by priority                     │
│    └─ Return top notification              │
│                                             │
└─────────────────┬───────────────────────────┘
                 │
                 │ JSON Response
                 │
      ┌──────────▼──────────┐
      │ {                  │
      │   guest_notif...  │
      │   visit_count: 1  │
      │   is_authenticated │
      │ }                  │
      └──────────┬──────────┘
                 │
                 ▼
      Frontend receives
      │
      ├─► Display notification
      ├─► Track analytics
      └─► Store dismissed
```

## 📊 Analytics Event Flow

```
┌────────────────────────────────────────────────┐
│        Notification Lifecycle Events           │
└────────────────────────────────────────────────┘

1. NOTIFICATION SHOWN
   ├─ Event Name: 'guest_notification_shown'
   ├─ Payload:
   │  ├─ guest_event: true
   │  ├─ notification_type: 'GUEST_WELCOME'
   │  └─ visit_count: 1
   ├─ When: Component mounts
   └─ Destination: Google Analytics

2. CTA CLICKED
   ├─ Event Name: 'guest_notification_cta_clicked'
   ├─ Payload:
   │  ├─ guest_event: true
   │  ├─ notification_type: 'GUEST_WELCOME'
   │  └─ cta_url: '/signup'
   ├─ When: User clicks CTA button
   └─ Destination: Google Analytics

3. NOTIFICATION DISMISSED
   ├─ Event Name: 'guest_notification_dismissed'
   ├─ Payload:
   │  ├─ guest_event: true
   │  ├─ notification_type: 'GUEST_WELCOME'
   │  └─ dismiss_count: 1
   ├─ When: User clicks X button
   └─ Destination: Google Analytics

┌────────────────────────────────────────────────┐
│        Analytics Dashboard Reports            │
└────────────────────────────────────────────────┘

Metrics to Track:
├─ Total notifications shown
├─ Click-through rate (CTR)
├─ Dismissal rate
├─ Conversion rate (notification → signup)
├─ Notifications by type
├─ Average time to interaction
└─ Repeat notification rate
```

## 🚀 Deployment Pipeline

```
┌──────────────┐
│ Development  │
│ Environment  │
│  (localhost) │
└──────┬───────┘
       │
       ▼
  [npm run dev]
       │
       ▼
┌──────────────┐
│ Staging      │
│ Environment  │
│  (staging.*) │
└──────┬───────┘
       │
       ├─ Code Review ──────┐
       │ QA Testing         │
       │ Performance Test   │
       │ Analytics Setup    │
       │ API Verification   │
       ├────────────────────┘
       │
       ▼ [npm run build]
┌──────────────┐
│ Production   │
│ Environment  │
│ (storyvermo) │
└──────┬───────┘
       │
       ├─ Health Check ─┐
       │ Monitoring     │
       │ Analytics      │
       │ Error Logs     │
       │ Performance    │
       └────────────────┘
       │
       ▼
  [24-48h Monitoring]
       │
       ├─ Stable? ──→ [Remove from Release Notes]
       └─ Issues?  ──→ [Rollback Plan]
```

---

This visual representation helps understand:
1. Component hierarchy and relationships
2. Data flow through the system
3. Responsive design breakpoints
4. Color and priority system
5. State management patterns
6. API integration points
7. Analytics tracking
8. Deployment process

For detailed implementation, see the comprehensive documentation files.
