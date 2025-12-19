'use client';

import React from 'react';

/**
 * Professional skeleton loader for story cards with subtle animations
 * Used during infinite scroll loading
 */
export default function StoryCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 bg-black rounded-xl border border-gray-900 mb-6 animate-fade-in">
      <div className="skeleton-content">
        {/* Header skeleton - creator chip */}
        <div className="flex items-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer"></div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="w-30 h-3.5 rounded bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer"></div>
            <div className="w-20 h-3 rounded bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-100"></div>
          </div>
        </div>

        {/* Cover image skeleton */}
        <div className="w-full h-72 rounded-lg bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer animation-delay-200"></div>

        {/* Title skeleton */}
        <div className="flex flex-col gap-2 my-4">
          <div className="h-4.5 rounded bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer animation-delay-150 w-[85%]"></div>
          <div className="h-4.5 rounded bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer animation-delay-150 w-[60%]"></div>
        </div>

        {/* Description skeleton */}
        <div className="flex flex-col gap-2.5 my-2">
          <div className="h-3.5 rounded bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-200"></div>
          <div className="h-3.5 rounded bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-200"></div>
          <div className="h-3.5 rounded bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-200 w-[40%]"></div>
        </div>

        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2 my-2">
          <div className="w-18 h-6 rounded-full bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer animation-delay-250"></div>
          <div className="w-18 h-6 rounded-full bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer animation-delay-250"></div>
          <div className="w-18 h-6 rounded-full bg-gradient-to-r from-black via-gray-900 to-black bg-[length:200%_100%] animate-shimmer animation-delay-250"></div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex justify-around items-center gap-4 mt-4 pt-4 border-t border-gray-800">
          <div className="w-12 h-10 rounded-lg bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-300"></div>
          <div className="w-12 h-10 rounded-lg bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-300"></div>
          <div className="w-12 h-10 rounded-lg bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-300"></div>
          <div className="w-12 h-10 rounded-lg bg-gradient-to-r from-black via-gray-800 to-black bg-[length:200%_100%] animate-shimmer animation-delay-300"></div>
        </div>
      </div>
    </div>
  );
}