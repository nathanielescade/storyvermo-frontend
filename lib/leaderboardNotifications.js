/**
 * Comprehensive notification utility functions for handling all notification types:
 * - LEADERBOARD: Weekly ranking updates
 * - ACHIEVEMENT: Top 3 winners + bonus points
 * - SYSTEM: Milestone notifications
 * - LIKE: Story/verse likes
 * - COMMENT: New comments
 * - VERSE: Verse contributions
 * - STORY: New stories from followed users
 * - FOLLOW: New followers
 * - MENTION: User mentions
 * - SAVE: Story saves
 * - WELCOME: Welcome notification
 */

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const isLeaderboardNotification = (notification) => {
  if (!notification) return false;
  return (
    notification?.notification_type === 'LEADERBOARD' ||
    notification?.type === 'LEADERBOARD' ||
    (notification?.message && notification.message.includes('Champion')) ||
    (notification?.message && notification.message.includes('ranked') && notification.message.includes('week')) ||
    (notification?.message && notification.message.includes('Leaderboard'))
  );
};

export const isAchievementNotification = (notification) => {
  if (!notification) return false;
  return (
    notification?.notification_type === 'ACHIEVEMENT' ||
    notification?.type === 'ACHIEVEMENT' ||
    (notification?.title && notification.title.includes('Champion')) ||
    (notification?.title && notification.title.includes('Winner')) ||
    (notification?.title && notification.title.includes('Bonus'))
  );
};

export const isSystemNotification = (notification) => {
  if (!notification) return false;
  return (
    notification?.notification_type === 'SYSTEM' ||
    notification?.type === 'SYSTEM' ||
    (notification?.title && notification.title.includes('Milestone'))
  );
};

export const isInactivityNotification = (notification) => {
  if (!notification) return false;
  const type = notification?.notification_type || notification?.type || '';
  return type.startsWith('INACTIVITY_');
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION ICON & COLOR MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const notificationTypeConfig = {
  LEADERBOARD: {
    icon: '📊',
    defaultGradient: 'from-cyan-400 to-blue-500',
    defaultBg: 'bg-cyan-500/10',
    defaultBorder: 'border-cyan-500/30'
  },
  ACHIEVEMENT: {
    icon: '🏆',
    defaultGradient: 'from-yellow-400 to-amber-500',
    defaultBg: 'bg-amber-500/10',
    defaultBorder: 'border-amber-500/30'
  },
  SYSTEM: {
    icon: '⭐',
    defaultGradient: 'from-purple-400 to-pink-500',
    defaultBg: 'bg-purple-500/10',
    defaultBorder: 'border-purple-500/30'
  },
  LIKE: {
    icon: '❤️',
    defaultGradient: 'from-red-400 to-pink-500',
    defaultBg: 'bg-red-500/10',
    defaultBorder: 'border-red-500/30'
  },
  COMMENT: {
    icon: '💬',
    defaultGradient: 'from-blue-400 to-cyan-500',
    defaultBg: 'bg-blue-500/10',
    defaultBorder: 'border-blue-500/30'
  },
  VERSE: {
    icon: '✨',
    defaultGradient: 'from-indigo-400 to-purple-500',
    defaultBg: 'bg-indigo-500/10',
    defaultBorder: 'border-indigo-500/30'
  },
  STORY: {
    icon: '📖',
    defaultGradient: 'from-emerald-400 to-teal-500',
    defaultBg: 'bg-emerald-500/10',
    defaultBorder: 'border-emerald-500/30'
  },
  FOLLOW: {
    icon: '👤',
    defaultGradient: 'from-orange-400 to-yellow-500',
    defaultBg: 'bg-orange-500/10',
    defaultBorder: 'border-orange-500/30'
  },
  MENTION: {
    icon: '@',
    defaultGradient: 'from-pink-400 to-rose-500',
    defaultBg: 'bg-pink-500/10',
    defaultBorder: 'border-pink-500/30'
  },
  SAVE: {
    icon: '💾',
    defaultGradient: 'from-green-400 to-emerald-500',
    defaultBg: 'bg-green-500/10',
    defaultBorder: 'border-green-500/30'
  },
  WELCOME: {
    icon: '🎉',
    defaultGradient: 'from-cyan-400 to-blue-500',
    defaultBg: 'bg-cyan-500/10',
    defaultBorder: 'border-cyan-500/30'
  },
  STORY_RECOMMENDED: {
    icon: '⭐',
    defaultGradient: 'from-yellow-400 to-orange-500',
    defaultBg: 'bg-yellow-500/10',
    defaultBorder: 'border-yellow-500/30'
  },
  INACTIVITY_2: {
    icon: '👋',
    defaultGradient: 'from-blue-400 to-cyan-500',
    defaultBg: 'bg-blue-500/10',
    defaultBorder: 'border-blue-500/30'
  },
  INACTIVITY_5: {
    icon: '✨',
    defaultGradient: 'from-purple-400 to-pink-500',
    defaultBg: 'bg-purple-500/10',
    defaultBorder: 'border-purple-500/30'
  },
  INACTIVITY_10: {
    icon: '✍️',
    defaultGradient: 'from-yellow-400 to-amber-500',
    defaultBg: 'bg-yellow-500/10',
    defaultBorder: 'border-yellow-500/30'
  },
  INACTIVITY_15: {
    icon: '💔',
    defaultGradient: 'from-red-400 to-pink-500',
    defaultBg: 'bg-red-500/10',
    defaultBorder: 'border-red-500/30'
  },
  INACTIVITY_30: {
    icon: '📣',
    defaultGradient: 'from-orange-400 to-red-500',
    defaultBg: 'bg-orange-500/10',
    defaultBorder: 'border-orange-500/30'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotificationTypeConfig = (notificationType) => {
  return notificationTypeConfig[notificationType] || {
    icon: '📬',
    defaultGradient: 'from-gray-400 to-slate-500',
    defaultBg: 'bg-slate-500/10',
    defaultBorder: 'border-slate-500/30'
  };
};

export const getLeaderboardNotificationMessage = (rank, finalizedScore) => {
  if (!rank) return null;

  const messages = {
    1: {
      title: '🏆 You\'re the #1 Champion This Week!',
      message: `You absolutely dominated! Keep inspiring our community! 🌟 Final score: ${finalizedScore}`,
      medal: '🏆',
      color: 'from-yellow-400 to-amber-500'
    },
    2: {
      title: '🥈 Amazing! You\'re #2 This Week!',
      message: `So close to the top - one more push! 💪 Final score: ${finalizedScore}`,
      medal: '🥈',
      color: 'from-gray-300 to-slate-400'
    },
    3: {
      title: '🥉 Awesome! You\'re in the Top 3!',
      message: `You\'re among our best creators! Keep shining! ⭐ Final score: ${finalizedScore}`,
      medal: '🥉',
      color: 'from-orange-400 to-amber-600'
    }
  };

  if (rank <= 3) {
    return messages[rank];
  }

  if (rank <= 10) {
    return {
      title: `📊 Week Results: You\'re #${rank}!`,
      message: `Keep creating great content! ✨ Final score: ${finalizedScore}`,
      medal: '🏅',
      color: 'from-cyan-400 to-blue-500'
    };
  }

  return {
    title: '📊 Weekly Leaderboard Updated!',
    message: `Keep engaging to climb the leaderboard! 🚀 Your score: ${finalizedScore}`,
    medal: '📈',
    color: 'from-purple-400 to-pink-500'
  };
};

export const formatLeaderboardNotificationDisplay = (notification) => {
  if (!isLeaderboardNotification(notification)) {
    return null;
  }

  const rank = notification.rank || notification.position;
  const score = notification.finalized_score || notification.score;

  return {
    icon: getLeaderboardNotificationMessage(rank, score)?.medal || '📊',
    title: notification.message || getLeaderboardNotificationMessage(rank, score)?.title,
    subtitle: notification.title || getLeaderboardNotificationMessage(rank, score)?.message,
    timestamp: notification.time_ago || 'Recently',
    isAchievement: rank && rank <= 3,
    rank,
    score,
    color: getLeaderboardNotificationMessage(rank, score)?.color,
    notificationType: 'LEADERBOARD'
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC NOTIFICATION FORMATTER
// ═══════════════════════════════════════════════════════════════════════════════

export const formatNotificationDisplay = (notification) => {
  if (!notification) return null;

  // Handle leaderboard/achievement notifications specially
  if (isLeaderboardNotification(notification) || isAchievementNotification(notification)) {
    return formatLeaderboardNotificationDisplay(notification);
  }

  // Get notification type
  const notificationType = notification.notification_type || notification.type || 'SYSTEM';
  const config = getNotificationTypeConfig(notificationType);

  return {
    icon: config.icon,
    title: notification.title || 'New Notification',
    subtitle: notification.message || '',
    timestamp: notification.time_ago || 'Recently',
    color: config.defaultGradient,
    gradient: config.defaultGradient,
    bg: config.defaultBg,
    border: config.defaultBorder,
    notificationType,
    isRead: notification.is_read,
    notificationId: notification.id
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotificationRoute = (notification) => {
  if (!notification) return '/notifications';

  const notificationType = notification.notification_type || notification.type;

  // Leaderboard notifications
  if (isLeaderboardNotification(notification) || isAchievementNotification(notification)) {
    return '/leaderboard';
  }

  // Story/Verse/Comment notifications
  if (notification.story && notification.verse) {
    return `/stories/${notification.story.slug}/?verse=${notification.verse.slug}`;
  }
  if (notification.story) {
    return `/stories/${notification.story.slug}`;
  }
  if (notification.verse) {
    return `/stories/${notification.verse.story_slug}/?verse=${notification.verse.slug}`;
  }

  // User profile notifications
  if (notification.sender) {
    return `/${notification.sender.username}`;
  }

  // Default to notifications page
  return '/notifications';
};


