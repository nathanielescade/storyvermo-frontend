import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { tagsApi } from '../../../../lib/api';

const TrendingTagsModal = ({ isOpen, onClose, onTagSelect }) => {
    const [trendingTags, setTrendingTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const dropdownRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        if (!isOpen) return;

        const fetchTrendingTags = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await tagsApi.getTrending();
                // Handle both array and object with results property
                let tags = Array.isArray(response) ? response : (response?.results || response?.tags || []);
                // Get top 10 trending tags
                const topTags = tags.slice(0, 10);
                setTrendingTags(topTags);
            } catch (err) {
                setError('Failed to load trending tags');
            } finally {
                setLoading(false);
            }
        };

        fetchTrendingTags();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTagClick = (tagName) => {
        onClose();
        // Navigate to homepage with tag filter, same as TagsSection does
        const slug = encodeURIComponent(String(tagName).toLowerCase().replace(/\s+/g, '-'));
        router.push(`/tags/${slug}/`);
    };

    return (
        <div 
            ref={dropdownRef}
            className="trending-tags-dropdown"
            style={{
                position: 'fixed',
                top: '70px',
                right: '20px',
                width: '320px',
                zIndex: '9998',
                display: isOpen ? 'flex' : 'none',
                flexDirection: 'column',
                maxHeight: '400px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.2)',
                backdropFilter: 'blur(10px)',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
                flex: 'none'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>🔥</span>
                    <span>Trending Tags</span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>

            {/* Content */}
            <div style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                padding: '8px',
                minHeight: '100px'
            }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', color: '#9ca3af' }}>
                        <div style={{ animation: 'spin 1s linear infinite' }} className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-400"></div>
                    </div>
                ) : error ? (
                    <div style={{
                        color: '#f87171',
                        fontSize: '14px',
                        padding: '12px',
                        backgroundColor: 'rgba(127, 29, 29, 0.3)',
                        borderRadius: '8px',
                        margin: '8px'
                    }}>
                        {error}
                    </div>
                ) : trendingTags.length === 0 ? (
                    <div style={{
                        color: '#9ca3af',
                        fontSize: '14px',
                        padding: '12px',
                        textAlign: 'center'
                    }}>
                        No trending tags yet
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {trendingTags.map((tag, index) => (
                            <button
                                key={index}
                                onClick={() => handleTagClick(tag.name || tag)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    textAlign: 'left',
                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                    border: '1px solid rgba(6, 182, 212, 0.2)',
                                    borderRadius: '8px',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '13px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)';
                                    e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)';
                                    e.target.style.borderColor = 'rgba(6, 182, 212, 0.2)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <i className="fas fa-tag" style={{ color: '#06b6d4', fontSize: '12px' }}></i>
                                    <div>
                                        <div style={{ fontWeight: '500', color: '#ffffff' }}>{tag.name || tag}</div>
                                        {tag.count && (
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{tag.count} stories</div>
                                        )}
                                    </div>
                                </div>
                                <i className="fas fa-arrow-right" style={{ color: '#06b6d4', fontSize: '11px' }}></i>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                padding: '12px',
                borderTop: '1px solid rgba(6, 182, 212, 0.2)',
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <a
                    onClick={(e) => {
                        e.preventDefault();
                        onClose();
                        router.push('/tags');
                    }}
                    style={{
                        color: '#06b6d4',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        padding: '4px 0'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.color = '#06b6d4';
                    }}
                >
                    Explore All Tags
                    <i className="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    );
};

export default TrendingTagsModal;
