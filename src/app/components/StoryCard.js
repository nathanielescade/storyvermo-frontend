import React, { useState, useRef, useEffect } from 'react';
import { Heart, Bookmark, Share2, MessageCircle, MoreVertical, ChevronDown } from 'lucide-react';

// Mock data for demonstration
const MOCK_STORIES = [
  {
    id: 1,
    slug: "enchanted-forest",
    title: "The Enchanted Forest",
    description: "Deep within the ancient woods lies a realm where magic still thrives. The trees whisper secrets of old, and mystical creatures dance in the moonlight. Every step reveals a new wonder, from glowing mushrooms to streams that sing.",
    cover_image: { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=1200&fit=crop" },
    creator: { username: "ForestWalker", profile_image: null },
    likes_count: 12450,
    comments_count: 890,
    shares_count: 456,
    saves_count: 234,
    user_has_liked: false,
    user_has_saved: false,
    created_at: "2024-01-15T10:30:00Z",
    tags: [{ name: "Fantasy" }, { name: "Magic" }, { name: "Nature" }],
    verses: [
      { id: 101, title: "Glowing Mushrooms", images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"] },
      { id: 102, title: "Ancient Spirits", images: ["https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800"] }
    ]
  },
  {
    id: 2,
    slug: "urban-nights",
    title: "Neon City Nights",
    description: "The city never sleeps, and neither do its stories. Every corner holds a new tale, every neon sign illuminates a different reality.",
    cover_image: { url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=1200&fit=crop" },
    creator: { username: "UrbanExplorer", profile_image: null },
    likes_count: 8920,
    comments_count: 445,
    shares_count: 221,
    saves_count: 567,
    user_has_liked: false,
    user_has_saved: false,
    created_at: "2024-01-14T18:45:00Z",
    tags: [{ name: "Urban" }, { name: "Night" }, { name: "City" }],
    verses: [
      { id: 201, title: "Crossing Paths", images: ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800"] }
    ]
  },
  {
    id: 3,
    slug: "ocean-waves",
    title: "Ocean Waves",
    description: "The rhythmic dance of ocean waves against the shore. Nature's meditation in motion.",
    cover_image: { url: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=1200&fit=crop" },
    creator: { username: "OceanLife", profile_image: null },
    likes_count: 21030,
    comments_count: 1560,
    shares_count: 670,
    saves_count: 890,
    user_has_liked: true,
    user_has_saved: false,
    created_at: "2024-01-13T08:20:00Z",
    tags: [{ name: "Ocean" }, { name: "Waves" }, { name: "Nature" }],
    verses: [
      { id: 301, title: "Sunrise Surf", images: ["https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800"] }
    ]
  },
  {
    id: 4,
    slug: "mountain-peak",
    title: "Mountain Peak",
    description: "Standing at the summit, where earth meets sky. The journey was worth every step.",
    cover_image: { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=1200&fit=crop" },
    creator: { username: "HikersJourney", profile_image: null },
    likes_count: 15670,
    comments_count: 780,
    shares_count: 430,
    saves_count: 1200,
    user_has_liked: false,
    user_has_saved: true,
    created_at: "2024-01-12T14:10:00Z",
    tags: [{ name: "Mountain" }, { name: "Hiking" }, { name: "Adventure" }],
    verses: [
      { id: 401, title: "The Ascent", images: ["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800"] }
    ]
  }
];

// Format time ago
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

// Format numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// HologramIcons Component
const HologramIcons = ({ 
  story, 
  isOwner = false, 
  isAuthenticated = true, 
  openAuthModal = () => {},
  setShowContributeModal = () => {},
  setShowRecommendModal = () => {},
  setShowEnlargeModal = () => {},
  onOpenDropdown = () => {}
}) => {
  return (
    <div className="flex justify-between items-center mb-3">
      {/* Like button */}
      <button 
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-105 transition-all relative"
        onClick={() => console.log('Like clicked')}
      >
        <i className={`${story.user_has_liked ? 'fas' : 'far'} fa-heart text-[18px] ${story.user_has_liked ? 'text-[#ff6b35]' : 'text-white'}`}></i>
        <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
          {formatNumber(story.likes_count)}
        </div>
      </button>

      {/* Comment button */}
      <button 
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-105 transition-all relative"
        onClick={() => console.log('Comment clicked')}
      >
        <i className="far fa-comment text-[18px] text-white"></i>
        <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
          {formatNumber(story.comments_count)}
        </div>
      </button>

      {/* Share button */}
      <button 
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-105 transition-all relative"
        onClick={() => console.log('Share clicked')}
      >
        <i className="fas fa-share text-[18px] text-white"></i>
        <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
          {formatNumber(story.shares_count)}
        </div>
      </button>

      {/* Save button */}
      <button 
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-105 transition-all relative"
        onClick={() => console.log('Save clicked')}
      >
        <i className={`${story.user_has_saved ? 'fas' : 'far'} fa-bookmark text-[18px] ${story.user_has_saved ? 'text-[#ff6b35]' : 'text-white'}`}></i>
      </button>

      {/* More options button */}
      <button 
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-105 transition-all"
        onClick={(e) => onOpenDropdown(e.currentTarget)}
      >
        <i className="fas fa-ellipsis-v text-[18px] text-white"></i>
      </button>
    </div>
  );
};

// ActionButtons Component
const ActionButtons = ({ 
  story, 
  localCommentsCount, 
  setShowCommentModal = () => {}, 
  setShowShareModal = () => {},
  isAuthenticated = true,
  openAuthModal = () => {},
  onStoryUpdate = () => {},
  onLikeBurst = () => {}
}) => {
  const [isLiked, setIsLiked] = useState(story.user_has_liked);
  const [isSaved, setIsSaved] = useState(story.user_has_saved);
  const [likesCount, setLikesCount] = useState(story.likes_count);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('like');
      return;
    }

    if (isLikeLoading) return;

    const wasLiked = isLiked;
    const prevLikesCount = likesCount;

    try {
      setIsLikeLoading(true);
      setIsLiked(!wasLiked);
      if (!wasLiked) {
        onLikeBurst();
      }
      setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update with actual server response (simulated)
      const newLikedStatus = !wasLiked;
      setIsLiked(newLikedStatus);
      setLikesCount(prevLikesCount + (newLikedStatus ? 1 : -1));

      if (onStoryUpdate) {
        await onStoryUpdate();
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setLikesCount(prevLikesCount);
      console.error('Failed to update like:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };
  
  const handleSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('save');
      return;
    }

    if (isSaveLoading) return;

    const wasSaved = isSaved;
    try {
      setIsSaveLoading(true);
      setIsSaved(!wasSaved);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update with actual server response (simulated)
      const newSavedStatus = !wasSaved;
      setIsSaved(newSavedStatus);

      if (onStoryUpdate) {
        await onStoryUpdate();
      }
    } catch (error) {
      setIsSaved(wasSaved);
      console.error('Failed to update save:', error);
    } finally {
      setIsSaveLoading(false);
    }
  };

  const getIconClass = (iconType, isActive) => {
    return `${isActive ? 'fas' : 'far'} ${iconType} text-[18px] ${isActive ? 'text-[#ff6b35]' : 'text-white'}`;
  };

  const baseButtonClasses = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer relative transition-all duration-200';
  const hoverClasses = 'hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] hover:scale-110';
  const inactiveClasses = 'border border-white/20';
  const activeClasses = 'bg-[#ff6b35]/20 border-2 border-[#ff6b35]';
  const loadingClasses = 'opacity-50 cursor-not-allowed';

  const likeButtonClasses = `${baseButtonClasses} ${hoverClasses} ${isLiked ? activeClasses : inactiveClasses} ${isLikeLoading ? 'transition-none' : ''}`;
  const saveButtonClasses = `${baseButtonClasses} ${hoverClasses} ${isSaved ? activeClasses : inactiveClasses} ${isSaveLoading ? 'transition-none' : ''}`;

  return (
    <div className="flex justify-between mb-3 w-full gap-2">
      {/* LIKE button */}
      <div 
        className={likeButtonClasses}
        onClick={handleLikeClick}
        role="button"
        tabIndex={0}
        aria-label={isLiked ? "Unlike story" : "Like story"}
        aria-busy={isLikeLoading}
        onKeyPress={(e) => e.key === 'Enter' && handleLikeClick(e)}
      >
        <i className={`${getIconClass('fa-heart', isLiked)}`}></i>
        <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10 transition-all duration-200">
          {formatNumber(likesCount)}
        </div>
      </div>

      {/* COMMENT button */}
      <div 
        className={`${baseButtonClasses} ${hoverClasses} ${inactiveClasses}`} 
        onClick={(e) => { 
          e.preventDefault();
          e.stopPropagation(); 
          setShowCommentModal(true); 
        }}
        role="button"
        tabIndex={0}
        aria-label="View comments"
        onKeyPress={(e) => e.key === 'Enter' && setShowCommentModal(true)}
      >
        <i className={getIconClass('fa-comment', false)}></i>
        <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
          {formatNumber(localCommentsCount || 0)}
        </div>
      </div>
      
      {/* SHARE button */}
      <div 
        className={`${baseButtonClasses} ${hoverClasses} ${inactiveClasses}`} 
        onClick={() => setShowShareModal(true)}
        role="button"
        tabIndex={0}
        aria-label="Share story"
        onKeyPress={(e) => e.key === 'Enter' && setShowShareModal(true)}
      >
        <i className="fas fa-share text-[18px] text-white"></i>
        <div className="absolute -bottom-1 -right-1 bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center z-10">
          {formatNumber(story.shares_count || 0)}
        </div>
      </div>

      {/* SAVE button */}
      <div 
        className={saveButtonClasses}
        onClick={handleSaveClick}
        role="button"
        tabIndex={0}
        aria-label={isSaved ? "Remove from saved" : "Save story"}
        aria-busy={isSaveLoading}
        onKeyPress={(e) => e.key === 'Enter' && handleSaveClick(e)}
      >
        <i className={`${getIconClass('fa-bookmark', isSaved)}`}></i>
      </div>
    </div>
  );
};

// Individual StoryCard Component (matches HTML structure)
const StoryCard = ({ story, index, onTagSelect }) => {
  const [liked, setLiked] = useState(story.user_has_liked);
  const [saved, setSaved] = useState(story.user_has_saved);
  const [likesCount, setLikesCount] = useState(story.likes_count);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState(null);
  const descRef = useRef(null);
  const [needsReadMore, setNeedsReadMore] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (descRef.current) {
      setNeedsReadMore(descRef.current.scrollHeight > descRef.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setDropdownCoords(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleOpenDropdown = (btnEl) => {
    try {
      if (!btnEl || typeof btnEl.getBoundingClientRect !== 'function') {
        setShowDropdown(true);
        return;
      }
      const rect = btnEl.getBoundingClientRect();
      const left = rect.left + (window.scrollX || 0);
      const top = rect.bottom + (window.scrollY || 0);
      setDropdownCoords({ left, top });
      setShowDropdown(true);
    } catch (e) {
      setShowDropdown(true);
    }
  };

  const getInitials = (username) => {
    return username?.slice(0, 1).toUpperCase() || 'U';
  };

  const triggerLikeBurst = () => {
    // Simulate like burst effect
    console.log('Like burst triggered');
  };

  return (
    <div className="relative w-full h-screen snap-start snap-always overflow-hidden">
      {/* Background Image */}
      <img
        src={story.cover_image?.url}
        alt={story.title}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.85)' }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

      {/* Bottom Hologram - Story Info */}
      <div className="absolute bottom-12 left-[5%] right-[5%] z-10 bg-black/60 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-5 shadow-2xl">
        {/* Hologram Icons */}
        <HologramIcons 
          story={story}
          onOpenDropdown={handleOpenDropdown}
        />
        
        {/* Title with ellipsis menu */}
        <div className="relative pr-8 mb-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            {story.title}
          </h2>
        </div>

        {/* Description */}
        <p 
          ref={descRef}
          className={`text-white/90 text-sm leading-relaxed mb-3 transition-all ${
            descExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {story.description}
        </p>
        {needsReadMore && (
          <button
            onClick={() => setDescExpanded(!descExpanded)}
            className="text-cyan-400 text-xs font-semibold mb-3"
          >
            {descExpanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto">
          {story.tags?.map((tag, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-full text-cyan-300 text-xs font-medium cursor-pointer hover:scale-105 transition-transform whitespace-nowrap"
              onClick={() => onTagSelect && onTagSelect(tag.name)}
            >
              #{tag.name}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <ActionButtons 
          story={story}
          localCommentsCount={story.comments_count}
          onLikeBurst={triggerLikeBurst}
        />

        {/* Creator Chip */}
        <div className="flex items-center justify-between bg-white/10 py-2 px-4 rounded-full border border-white/20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {getInitials(story.creator?.username)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {story.creator?.username || 'unknown'}
              </span>
              <span className="text-xs text-gray-400 truncate">
                {formatTimeAgo(story.created_at)}
              </span>
            </div>
          </div>

          <button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white py-1.5 px-5 rounded-full font-bold text-sm hover:scale-105 transition-all flex items-center gap-1.5 flex-shrink-0">
            Verses
            <span className="bg-black/30 text-white text-xs font-bold py-0.5 px-1.5 rounded-full">
              {story.verses?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute z-20 w-48 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg overflow-hidden"
          style={dropdownCoords ? { 
            left: `${dropdownCoords.left}px`, 
            top: `${dropdownCoords.top}px` 
          } : { right: '20px', top: '200px' }}
        >
          <button className="w-full text-left px-4 py-3 text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
            <Share2 size={16} className="text-green-400" />
            <span>Share Post</span>
          </button>
          <button className="w-full text-left px-4 py-3 text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/10">
            <MessageCircle size={16} className="text-yellow-400" />
            <span>Report Post</span>
          </button>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 animate-bounce opacity-70">
        <ChevronDown size={32} className="text-white" />
      </div>
    </div>
  );
};

// Main Feed Component
export default function StoryCardFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const cardHeight = window.innerHeight;
      const newIndex = Math.round(scrollPosition / cardHeight);
      setCurrentIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTagSelect = (tagName) => {
    console.log('Tag selected:', tagName);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Scrollable Container */}
      <div
        ref={containerRef}
        className="w-full h-screen overflow-y-scroll snap-y snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {MOCK_STORIES.map((story, index) => (
          <StoryCard
            key={story.id}
            story={story}
            index={index}
            onTagSelect={handleTagSelect}
          />
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
        {MOCK_STORIES.map((_, index) => (
          <div
            key={index}
            className={`w-1 rounded-full transition-all ${
              index === currentIndex
                ? 'h-8 bg-white'
                : 'h-2 bg-white/40'
            }`}
          />
        ))}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}