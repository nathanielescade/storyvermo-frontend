'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { absoluteUrl } from '../../../lib/api';

function SmartImg({ src, alt = '', width, height, className, style }) {
  if (!src) return null;
  const isObjectUrl = typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));

  if (isObjectUrl) {
    const imgStyle = { ...(style || {}) };
    if (!imgStyle.objectFit) imgStyle.objectFit = 'cover';
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={imgStyle}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
}

export default function WeeklyWinnersBanner({ winners = [], isFinalized = false }) {
  const [animatedWinners, setAnimatedWinners] = useState([]);

  useEffect(() => {
    if (winners && winners.length > 0) {
      // Stagger animation of winners
      winners.forEach((winner, index) => {
        setTimeout(() => {
          setAnimatedWinners(prev => [...prev, winner]);
        }, index * 200);
      });
    }
  }, [winners]);

  if (!isFinalized || !winners || winners.length === 0) {
    return null;
  }

  const getGradient = (rank) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 via-amber-400 to-orange-400';
      case 2:
        return 'from-gray-300 via-slate-300 to-gray-400';
      case 3:
        return 'from-orange-400 via-amber-500 to-orange-600';
      default:
        return 'from-cyan-400 to-blue-500';
    }
  };

  const getMedalEmoji = (rank) => {
    switch (rank) {
      case 1:
        return '🏆';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🌟';
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl p-6 mb-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-2">
          🏆 Weekly Winners
        </h2>
        <p className="text-xs text-gray-400">This Week&apos;s Top Performers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {winners.slice(0, 3).map((winner, index) => {
          const rank = index + 1;
          const isAnimated = animatedWinners.includes(winner);
          const profileImageUrl = winner.profile_image_url ? absoluteUrl(winner.profile_image_url) : null;
          const getInitial = (name) => {
            if (!name) return '';
            return String(name).charAt(0).toUpperCase();
          };

          return (
            <Link
              key={`${winner.username}-${rank}`}
              href={`/${winner.username}`}
              className={`block ${isAnimated ? 'animate-bounce-in' : 'opacity-0'} transition-all duration-300`}
            >
              <div
                className={`relative bg-gradient-to-br ${getGradient(
                  rank
                )} rounded-2xl p-1 shadow-lg hover:shadow-xl transition-all hover:scale-105 h-full`}
              >
                <div className="bg-slate-950 rounded-xl p-4 flex flex-col items-center justify-center min-h-64">
                  {/* Medal Badge */}
                  <div className="text-5xl mb-3 animate-bounce-medal">
                    {getMedalEmoji(rank)}
                  </div>

                  {/* Profile Image */}
                  <div className="mb-3">
                    {profileImageUrl ? (
                      <SmartImg
                        src={profileImageUrl}
                        alt={winner.display_name || winner.username}
                        width={80}
                        height={80}
                        className="rounded-full object-cover border-2 border-cyan-400/50 w-20 h-20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white text-2xl font-bold border-2 border-cyan-400/50">
                        {getInitial(winner.display_name || winner.username)}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-white text-center truncate w-full px-2">
                    {winner.display_name || winner.username}
                  </h3>
                  <p className="text-xs text-gray-400 text-center mb-3">@{winner.username}</p>

                  {/* Score */}
                  <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center border border-cyan-500/20">
                    <span className="text-xs text-gray-400">Final Score</span>
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                      ⚡ {winner.finalized_score || 0}
                    </p>
                  </div>

                  {/* Position Badge */}
                  <div className="mt-3 text-xs font-semibold text-cyan-400">
                    #{rank}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
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
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }

        .animate-bounce-medal {
          animation: bounce-medal 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
