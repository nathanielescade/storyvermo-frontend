import React from 'react';

const HologramIcons = ({ 
    story, 
    isOwner, 
    isAuthenticated, 
    openAuthModal,
    setShowContributeModal,
    setShowRecommendModal,
    setShowEnlargeModal,
    setShowDropdown
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
        setShowDropdown(true);
    };

    return (
        <div className="hologram-icons-row" style={{ position: 'absolute', right: '0.5rem', top: '-32px', display: 'flex', gap: '18px', zIndex: '10' }}>
            {story.allow_contributions && !isOwner && (
                <button 
                    className="hologram-icon-btn" 
                    title="Contribute" 
                    onClick={handleContribute}
                    style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #ff6b35', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#ff6b35', fontSize: '1.25rem', cursor: 'pointer' }}
                >
                    <i className="fas fa-plus"></i>
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
                style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '50%', border: '2px solid #ff6b35', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', color: '#ff6b35', fontSize: '1.25rem', cursor: 'pointer' }}
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