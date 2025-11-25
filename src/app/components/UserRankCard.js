'use client';

import { useEffect, useState } from 'react';

export default function UserRankCard({
  rank = null,
  weeklyScore = 0,
  lifetimeScore = 0,
  weekNumber = 1,
  year = 2025,
  totalUsers = 0,
}) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [nextResetTime, setNextResetTime] = useState('');

  useEffect(() => {
    // Calculate days left in week (Monday-Sunday)
    const now = new Date();
    const currentDayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Days until next Sunday (7 = Sunday)
    let daysUntilSunday = 7 - currentDayOfWeek;
    if (daysUntilSunday <= 0) daysUntilSunday = 7; // If today is Sunday, next reset is in 7 days
    
    setDaysLeft(daysUntilSunday);

    // Calculate next Monday 12:00 AM UTC
    const nextMonday = new Date();
    nextMonday.setUTCDate(nextMonday.getUTCDate() + ((1 + 7 - currentDayOfWeek) % 7));
    nextMonday.setUTCHours(0, 0, 0, 0);

    // Format reset time
    const options = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    };
    setNextResetTime(nextMonday.toLocaleString('en-US', options) + ' UTC');
  }, []);

  const getRankMedal = () => {
    if (!rank) return null;
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏅';
    return null;
  };

  const getRankColor = () => {
    if (!rank) return 'text-gray-400';
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    if (rank <= 10) return 'text-cyan-400';
    return 'text-gray-400';
  };

  const getRankPercentage = () => {
    if (!rank || !totalUsers || totalUsers === 0) return 0;
    return ((totalUsers - rank) / totalUsers) * 100;
  };

  return (
    <div className="w-full bg-gradient-to-br from-cyan-950/40 via-blue-950/40 to-slate-950 rounded-3xl border border-cyan-500/40 shadow-lg p-6 mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm text-gray-400 mb-1">Your Rank</h3>
          <div className="flex items-center gap-2">
            {getRankMedal() && <span className="text-2xl">{getRankMedal()}</span>}
            <p className={`text-3xl font-bold ${getRankColor()}`}>
              {rank ? `#${rank}` : 'Not Ranked'}
            </p>
            {totalUsers > 0 && (
              <span className="text-xs text-gray-400 ml-2">of {totalUsers}</span>
            )}
          </div>
        </div>

        {/* Week Info Badge */}
        <div className="bg-slate-900/60 rounded-xl px-4 py-3 border border-cyan-500/20 text-right">
          <p className="text-xs text-gray-400">Week {weekNumber}</p>
          <p className="text-sm font-semibold text-cyan-400">{year}</p>
        </div>
      </div>

      {/* Scores Section */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Weekly Score */}
        <div className="bg-slate-900/40 rounded-xl p-4 border border-cyan-500/20">
          <p className="text-xs text-gray-400 mb-2">This Week</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-cyan-400">⚡</span>
            <p className="text-2xl font-bold text-white">{weeklyScore}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">points</p>
        </div>

        {/* Lifetime Score */}
        <div className="bg-slate-900/40 rounded-xl p-4 border border-cyan-500/20">
          <p className="text-xs text-gray-400 mb-2">All-Time</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-purple-400">✨</span>
            <p className="text-2xl font-bold text-white">{lifetimeScore}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">lifetime</p>
        </div>
      </div>

      {/* Progress Bar - Position */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Position in Leaderboard</span>
          <span className="text-xs text-cyan-400 font-semibold">
            {Math.round(getRankPercentage())}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800/60 rounded-full border border-cyan-500/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${getRankPercentage()}%` }}
          />
        </div>
      </div>

      {/* Week Progress */}
      <div className="bg-slate-900/60 rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Days Left in Week</span>
          <span className="text-sm font-bold text-cyan-400">{daysLeft} days</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Leaderboard resets every Monday at 12:00 AM UTC
        </p>
        <div className="text-xs text-gray-400 bg-slate-800/40 rounded px-3 py-2 border border-cyan-500/10">
          <span className="text-cyan-400 font-semibold">Next Reset:</span> {nextResetTime}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
