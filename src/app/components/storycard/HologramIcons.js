import React, { useState } from 'react';

const HologramIcons = ({ 
    story, 
    isOwner, 
    isAuthenticated, 
    openAuthModal,
    setShowContributeModal,
    setShowRecommendModal,
    setShowEnlargeModal,
    // new callback: onOpenDropdown(element)
    onOpenDropdown,
    // Add a new prop to track dropdown state
    isDropdownOpen
}) => {
    const handleContribute = () => {
        if (!isAuthenticated) {
            openAuthModal('contribute', { slug: story.slug, id: story.id });
            return;
        }
        setShowContributeModal(true);
    };

    const handleRecommend = () => {
        if (!isAuthenticated) {
            openAuthModal('recommend', { id: story.id, slug: story.slug });
            return;
        }
        setShowRecommendModal(true);
    };

    const handleEnlarge = () => {
        setShowEnlargeModal(true);
    };

    const handleMoreOptions = (event) => {
        event.stopPropagation();
        
        // If dropdown is already open, close it
        if (isDropdownOpen) {
            // Pass null to indicate closing
            if (typeof onOpenDropdown === 'function') {
                onOpenDropdown(null);
            }
            return;
        }
        
        // Otherwise, open it
        if (typeof onOpenDropdown === 'function') {
            onOpenDropdown(event.currentTarget);
            return;
        }
        // Fallback: if no callback, try the old API
        if (typeof setShowDropdown === 'function') setShowDropdown(true);
    };

    const handleStoryUrlClick = () => {
        if (story.url) {
            window.open(story.url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="hologram-icons-row" style={{ position: 'absolute', right: '0.5rem', top: '-32px', display: 'flex', gap: '4px', zIndex: '10' }}>
            {story.url && (
                <button 
                    className="hologram-icon-btn story-url-btn" 
                    title="Visit story link" 
                    onClick={handleStoryUrlClick}
                    style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)', borderRadius: '50%', border: '3px solid #00d4ff', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(0, 212, 255, 0.2)', color: '#ffffff', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease', position: 'relative' }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0, 212, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 30px rgba(0, 212, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 212, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(0, 212, 255, 0.2)';
                    }}
                >
                    <i className="fas fa-link"></i>
                </button>
            )}
            {story.allow_contributions && (
                <button 
                    className="hologram-icon-btn collaborate-btn" 
                    title="Contribute to this story" 
                    onClick={handleContribute}
                    style={{ 
                        background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', 
                        borderRadius: '50%', 
                        border: '3px solid #ff6b35', 
                        width: '42px', 
                        height: '42px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(255, 107, 53, 0.2)', 
                        color: '#ffffff', 
                        fontSize: '1.25rem', 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        animation: 'collab-aura 4s ease-in-out infinite',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.6), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 30px rgba(255, 107, 53, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(255, 107, 53, 0.2)';
                    }}
                >
                    <i className="fas fa-users"></i>
                </button>
            )}
            <button 
                className="hologram-icon-btn" 
                title="Recommend" 
                onClick={handleRecommend}
                style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #0ff', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#0ff', fontSize: '1.25rem', cursor: 'pointer' }}
            >
                <i className="fas fa-paper-plane"></i>
            </button>
            <button 
                className="hologram-icon-btn" 
                title="View Image" 
                onClick={handleEnlarge}
                style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #00ff9d', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#00ff9d', fontSize: '1.25rem', cursor: 'pointer' }}
            >
                <i className="fas fa-expand"></i>
            </button>
            <button 
                className="hologram-icon-btn" 
                title="More Options" 
                onClick={handleMoreOptions}
                style={{ 
                    background: 'rgba(255,255,255,0.18)', 
                    borderRadius: '50%', 
                    border: '2px solid #9d00ff', 
                    width: '38px', 
                    height: '38px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10), 0 0 15px rgba(157,0,255,0.3)', 
                    color: '#ffffff', 
                    fontSize: '1.25rem', 
                    cursor: 'pointer', 
                    position: 'relative', 
                    overflow: 'hidden' 
                }}
            >
                <i className="fas fa-ellipsis-v"></i>
            </button>
        </div>
    );
};

export default HologramIcons;