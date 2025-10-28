// components/RecommendModal.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

const RecommendModal = ({ isOpen, onClose, followers = [], storyId, storySlug }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [filteredFollowers, setFilteredFollowers] = useState([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSearchTerm('');
      setSelectedFollowers([]);
      setIsSending(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter followers based on search term
    if (searchTerm === '') {
      setFilteredFollowers(followers);
    } else {
      const filtered = followers.filter(follower => 
        follower.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (follower.full_name && follower.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredFollowers(filtered);
    }
  }, [searchTerm, followers]);

  const handleFollowerClick = (follower) => {
    setSelectedFollowers(prev => {
      const isSelected = prev.some(f => f.username === follower.username);
      if (isSelected) {
        return prev.filter(f => f.username !== follower.username);
      } else {
        return [...prev, follower];
      }
    });
  };

  const sendRecommendation = async () => {
    if (selectedFollowers.length === 0) {
      alert('Please select at least one follower.');
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch('/api/recommend-story/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || ''
        },
        body: JSON.stringify({ 
          story_id: storyId, 
          recipients: selectedFollowers.map(f => f.username) 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onClose();
        // Show success notification
        alert('Recommendation sent!');
      } else {
        alert(data.error || 'Failed to send recommendation.');
      }
    } catch (error) {
      console.error('Error sending recommendation:', error);
      alert('Failed to send recommendation.');
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to get CSRF token (if needed)
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      id="recommendModal" 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-dark-900 rounded-2xl shadow-2xl p-7 w-full max-w-md relative border border-dark-700">
        {/* Fixed close button - larger and with proper icon */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white text-2xl font-bold rounded-full bg-gradient-to-r from-neon-blue to-neon-purple bg-opacity-20 hover:bg-opacity-30 transition-all"
        >
          <i className="fas fa-times"></i>
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-center text-gradient">Recommend Story</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-gray-200">Select followers to recommend to:</label>
          <div id="followersList" className="flex flex-wrap gap-3 mb-2">
            {filteredFollowers.map((follower, index) => {
              const isSelected = selectedFollowers.some(f => f.username === follower.username);
              
              return (
                <div 
                  key={index}
                  className={`follower-chip flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-dark-800 to-dark-700 text-sm font-semibold text-gray-100 cursor-pointer hover:bg-neon-blue/10 select-none min-w-[120px] ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleFollowerClick(follower)}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-r from-neon-blue to-neon-purple text-white overflow-hidden">
                    {follower.profile_image_url ? (
                      <Image 
                        src={follower.profile_image_url} 
                        alt={follower.full_name || follower.username} 
                        width={32}
                        height={32}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      follower.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  {/* Name */}
                  <span className="truncate">{follower.full_name || follower.username}</span>
                </div>
              );
            })}
          </div>
          
          <input 
            type="text" 
            id="recommendSearch" 
            className="w-full border border-dark-700 bg-dark-800 text-gray-100 rounded px-3 py-2 mb-2" 
            placeholder="Search followers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={sendRecommendation}
          disabled={isSending}
          className="w-full py-2 rounded bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold text-lg hover:scale-105 transition disabled:opacity-50"
        >
          {isSending ? 'Sending...' : 'Send Recommendation'}
        </button>
      </div>
      
      <style jsx>{`
        /* Dark theme overrides */
        .bg-dark-900 {
          background: #18181c;
        }
        .border-dark-700 {
          border-color: #23232a;
        }
        .bg-dark-800 {
          background: #23232a;
        }
        .text-gradient {
          background: linear-gradient(90deg, #0ff, #8a4fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
        
        /* Style for selected follower chips */
        .follower-chip.selected {
          background: linear-gradient(90deg, rgba(0, 212, 255, 0.3), rgba(138, 79, 255, 0.3));
          border: 1px solid rgba(0, 212, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default RecommendModal;