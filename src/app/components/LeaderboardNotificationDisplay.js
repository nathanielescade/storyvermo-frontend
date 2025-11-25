'use client';

import { useState, useEffect } from 'react';
import {
  formatLeaderboardNotificationDisplay,
  isLeaderboardNotification,
  isAchievementNotification
} from '../../../lib/leaderboardNotifications';

export default function LeaderboardNotificationDisplay({ notification, onMarkAsRead, onNavigate }) {
  const [displayData, setDisplayData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let data = null;
    
    // Handle both leaderboard and achievement notifications
    if (isLeaderboardNotification(notification) || isAchievementNotification(notification)) {
      data = formatLeaderboardNotificationDisplay(notification);
    }
    
    setDisplayData(data);
  }, [notification]);

  if (!displayData) {
    return null;
  }

  const handleClick = () => {
    if (onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    setShowDetails(true);
    if (onNavigate) {
      // Navigate to leaderboard or profile page
      onNavigate('/leaderboard');
    }
  };

  return (
    <>
      {/* Compact Notification Item */}
      <div
        className={`p-3 rounded-lg cursor-pointer transition-all mb-2 ${
          !notification.is_read
            ? 'bg-gradient-to-r ' + displayData.color + ' bg-opacity-20 border border-cyan-500/30'
            : 'bg-slate-900/40 border border-cyan-500/10'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              displayData.isAchievement
                ? 'bg-gradient-to-br ' + displayData.color + ' shadow-lg'
                : 'bg-slate-800'
            }`}
          >
            {displayData.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{displayData.title}</div>
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{displayData.subtitle}</div>
            <div className="text-xs text-cyan-400 mt-2">{displayData.timestamp}</div>
          </div>

          {/* Unread Indicator */}
          {!notification.is_read && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 mt-1" />
          )}
        </div>
      </div>

      {/* Full Details Modal */}
      {showDetails && (
        <LeaderboardNotificationModal
          notification={notification}
          displayData={displayData}
          onClose={() => setShowDetails(false)}
          isAchievement={isAchievementNotification(notification)}
        />
      )}
    </>
  );
}

function LeaderboardNotificationModal({ notification, displayData, onClose, isAchievement }) {
  const getMedalEmoji = (rank) => {
    if (!rank) return '📊';
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏅';
    return '📈';
  };

  const getGradient = (rank) => {
    if (!rank) return 'from-cyan-400 to-blue-500';
    if (rank === 1) return 'from-yellow-400 to-amber-500';
    if (rank === 2) return 'from-gray-300 to-slate-400';
    if (rank === 3) return 'from-orange-400 to-amber-600';
    if (rank <= 10) return 'from-cyan-400 to-blue-500';
    return 'from-purple-400 to-pink-500';
  };

  const rank = displayData.rank;
  const score = displayData.score;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-8 max-w-md w-full animate-bounce-in`}>
        {/* Header with Medal */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce-medal">{getMedalEmoji(rank)}</div>

          <h2 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${getGradient(
            rank
          )} mb-2`}>
            {isAchievement ? 'Achievement Unlocked!' : rank ? `#${rank}` : 'Leaderboard Update'}
          </h2>

          <p className="text-lg font-semibold text-white mb-2">{displayData.title}</p>
          <p className="text-sm text-gray-300">{displayData.subtitle}</p>
        </div>

        {/* Score Details */}
        {score && (
          <div className="bg-slate-900/60 rounded-xl p-4 mb-6 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">
                {isAchievement ? 'Bonus Points' : 'Final Week Score'}
              </span>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                ⚡ {score}
              </span>
            </div>
          </div>
        )}

        {/* Rank Info - Show for top achievers */}
        {rank && rank <= 3 && (
          <div className={`bg-gradient-to-br ${getGradient(rank)} bg-opacity-10 rounded-xl p-4 mb-6 border border-cyan-500/20`}>
            <p className="text-sm text-white font-semibold">
              {rank === 1 &&
                '🏆 You dominated this week! Keep up the amazing work and inspire the community!'}
              {rank === 2 &&
                '🥈 Incredible performance! Just a little more engagement can get you to #1!'}
              {rank === 3 &&
                '🥉 Outstanding effort! You\'re in the top 3 best creators. Keep creating amazing content!'}
            </p>
          </div>
        )}

        {/* Bonus Points Message for Top 10 */}
        {isAchievement && rank && rank > 3 && rank <= 10 && (
          <div className="bg-emerald-500/10 rounded-xl p-4 mb-6 border border-emerald-500/20">
            <p className="text-sm text-white font-semibold">
              🎖️ Congratulations on placing #{rank}! You earned a bonus of {score} lifetime points!
            </p>
          </div>
        )}

        {/* General Achievement Message */}
        {isAchievement && (!rank || rank > 10) && (
          <div className="bg-purple-500/10 rounded-xl p-4 mb-6 border border-purple-500/20">
            <p className="text-sm text-white font-semibold">
              ✨ Great effort this week! Keep engaging with the community to climb the leaderboard!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-cyan-500/20 text-white font-semibold hover:bg-slate-800 transition-all"
          >
            Close
          </button>
          <button
            onClick={() => {
              window.location.href = '/leaderboard';
            }}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all"
          >
            View Leaderboard →
          </button>
        </div>

        <style jsx>{`
          @keyframes bounce-in {
            0% {
              transform: scale(0.8);
              opacity: 0;
            }
            60% {
              transform: scale(1.1);
              opacity: 1;
            }
            80% {
              transform: scale(0.95);
            }
            100% {
              transform: scale(1);
            }
          }

          @keyframes bounce-medal {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-15px);
            }
          }

          .animate-bounce-in {
            animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
          }

          .animate-bounce-medal {
            animation: bounce-medal 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
