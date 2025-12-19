'use client';

import React from 'react';

/**
 * Professional skeleton loader with inlined critical CSS
 * Prevents render-blocking and ensures instant display
 */
export default function StoryCardSkeleton() {
  return (
    <div style={styles.skeleton}>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: calc(200% + 200px) 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatar}></div>
          <div style={styles.headerText}>
            <div style={styles.username}></div>
            <div style={styles.timestamp}></div>
          </div>
        </div>

        {/* Cover image */}
        <div style={styles.image}></div>

        {/* Title */}
        <div style={styles.titleSection}>
          <div style={{...styles.titleLine, width: '85%'}}></div>
          <div style={{...styles.titleLine, width: '60%'}}></div>
        </div>

        {/* Description */}
        <div style={styles.description}>
          <div style={{...styles.descLine, width: '85%'}}></div>
          <div style={{...styles.descLine, width: '60%'}}></div>
          <div style={{...styles.descLine, width: '40%'}}></div>
        </div>

        {/* Tags */}
        <div style={styles.tags}>
          <div style={styles.tag}></div>
          <div style={styles.tag}></div>
          <div style={styles.tag}></div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <div style={styles.button}></div>
          <div style={styles.button}></div>
          <div style={styles.button}></div>
          <div style={styles.button}></div>
        </div>
      </div>
    </div>
  );
}

const shimmerGradient = {
  background: 'linear-gradient(90deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 2s infinite'
};

const styles = {
  skeleton: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    background: '#000000',
    borderRadius: '12px',
    border: '1px solid #1a1a1a',
    marginBottom: '1.5rem',
    animation: 'fadeIn 0.3s ease-in-out'
  },
  content: {
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    paddingBottom: '0.5rem'
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    ...shimmerGradient
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1
  },
  username: {
    width: '120px',
    height: '14px',
    borderRadius: '4px',
    ...shimmerGradient
  },
  timestamp: {
    width: '80px',
    height: '12px',
    borderRadius: '4px',
    ...shimmerGradient,
    animationDelay: '0.1s'
  },
  image: {
    width: '100%',
    height: '300px',
    borderRadius: '8px',
    ...shimmerGradient,
    animationDelay: '0.2s'
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    margin: '1rem 0 0.5rem 0'
  },
  titleLine: {
    height: '18px',
    borderRadius: '4px',
    ...shimmerGradient,
    animationDelay: '0.15s'
  },
  description: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    margin: '0.5rem 0'
  },
  descLine: {
    height: '14px',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #000000 0%, #0d0d0d 50%, #000000 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2.5s infinite 0.2s'
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    margin: '0.5rem 0'
  },
  tag: {
    width: '70px',
    height: '24px',
    borderRadius: '12px',
    ...shimmerGradient,
    animationDelay: '0.25s'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #1a1a1a'
  },
  button: {
    width: '50px',
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(90deg, #000000 0%, #0d0d0d 50%, #000000 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2.7s infinite 0.3s'
  }
};