'use client';

import React from 'react';
import './storycard/StoryCardSkeleton.css';

/**
 * Professional skeleton loader for story cards with subtle animations
 * Used during infinite scroll loading
 */
export default function StoryCardSkeleton() {
  return (
    <div className="story-card-skeleton">
      <div className="skeleton-content">
        {/* Header skeleton - creator chip */}
        <div className="skeleton-header">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-header-text">
            <div className="skeleton-username"></div>
            <div className="skeleton-timestamp"></div>
          </div>
        </div>

        {/* Cover image skeleton */}
        <div className="skeleton-image"></div>

        {/* Title skeleton */}
        <div className="skeleton-title-section">
          <div className="skeleton-title-line skeleton-line-1"></div>
          <div className="skeleton-title-line skeleton-line-2"></div>
        </div>

        {/* Description skeleton */}
        <div className="skeleton-description">
          <div className="skeleton-desc-line skeleton-line-1"></div>
          <div className="skeleton-desc-line skeleton-line-2"></div>
          <div className="skeleton-desc-line skeleton-line-3"></div>
        </div>

        {/* Tags skeleton */}
        <div className="skeleton-tags">
          <div className="skeleton-tag"></div>
          <div className="skeleton-tag"></div>
          <div className="skeleton-tag"></div>
        </div>

        {/* Action buttons skeleton */}
        <div className="skeleton-actions">
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
        </div>
      </div>
    </div>
  );
}
