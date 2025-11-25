'use client';

import { useEffect, useState } from 'react';

export default function WeeklyProgressBar({ weekNumber = 1, year = 2025, isFinalized = false }) {
  const [daysElapsed, setDaysElapsed] = useState(0);
  const [totalDays] = useState(7);
  const [resetTime, setResetTime] = useState('');
  const [isOffHours, setIsOffHours] = useState(false);

  useEffect(() => {
    // Calculate current day of week (Monday = 0, Sunday = 6)
    const now = new Date();
    const currentDayOfWeek = now.getUTCDay();
    
    // Monday = 1, so offset by 1
    let dayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // 0 = Monday, 6 = Sunday
    setDaysElapsed(dayOfWeek + 1); // Add 1 because we count from day 1, not day 0

    // Check if we're in off-hours (Sunday 5pm-11:59pm UTC)
    const hour = now.getUTCHours();
    const isAfter5pm = currentDayOfWeek === 0 && hour >= 17;
    setIsOffHours(isAfter5pm);

    // Calculate next Monday 12:00 AM UTC
    const nextMonday = new Date();
    nextMonday.setUTCDate(nextMonday.getUTCDate() + ((1 + 7 - currentDayOfWeek) % 7));
    nextMonday.setUTCHours(0, 0, 0, 0);

    // Format reset time
    const options = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    };
    setResetTime(nextMonday.toLocaleString('en-US', options) + ' UTC');
  }, []);

  const progressPercentage = (daysElapsed / totalDays) * 100;
  const getStatusColor = () => (isOffHours ? 'from-amber-500 to-orange-500' : 'from-green-500 to-emerald-500');
  const getStatusLabel = () =>
    isOffHours
      ? 'Off-Hours (Points count to lifetime only)'
      : 'Counting Period (Points count to weekly & lifetime)';

  return (
    <div
      className={`w-full rounded-3xl border shadow-lg p-6 mb-6 animate-fade-in bg-gradient-to-br ${
        isOffHours ? 'from-amber-950/30 via-orange-950/30' : 'from-green-950/30 via-emerald-950/30'
      } to-slate-950 ${isOffHours ? 'border-amber-500/40' : 'border-green-500/40'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm text-gray-400 mb-1">Weekly Progress</h3>
          <p className="text-lg font-bold text-white">
            Week {weekNumber} of {year}
          </p>
        </div>

        {/* Status Badge */}
        <div
          className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getStatusColor()} text-white text-xs font-semibold`}
        >
          {isOffHours ? '🌙 Off-Hours' : '📊 Active'}
        </div>
      </div>

      {/* Days Display */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">
          Days Elapsed: <span className="text-cyan-400 font-bold">{daysElapsed}/7</span>
        </span>
        <span className="text-xs text-gray-500">
          {totalDays - daysElapsed} days remaining
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-slate-800/60 rounded-full border border-cyan-500/20 overflow-hidden mb-4">
        <div
          className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-500 ease-out`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Day Markers */}
      <div className="flex justify-between mb-4 text-xs text-gray-500">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
          <span
            key={day}
            className={`font-semibold ${
              index + 1 === daysElapsed
                ? 'text-cyan-400'
                : index + 1 < daysElapsed
                  ? 'text-gray-400'
                  : 'text-gray-600'
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Status Information */}
      <div className="bg-slate-900/60 rounded-xl p-4 border border-cyan-500/20">
        <p className="text-xs text-gray-400 mb-2">{getStatusLabel()}</p>
        <div className="text-xs text-gray-500">
          <p>
            <span className="text-green-400 font-semibold">Mon-Sun 4:59pm:</span> Points count to both weekly
            and lifetime scores
          </p>
          <p className="mt-1">
            <span className="text-amber-400 font-semibold">Sun 5pm-11:59pm:</span> Points count to lifetime only
            (weekly is frozen)
          </p>
        </div>
      </div>

      {/* Reset Time */}
      <div className="mt-4 text-xs text-gray-400 bg-slate-800/40 rounded px-3 py-2 border border-cyan-500/10">
        <span className="text-cyan-400 font-semibold">Next Reset:</span> {resetTime}
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
