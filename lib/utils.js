// utils.js - Fixed createBubbles function
// Format number for display
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Format time ago
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 5) {
    return 'now';
  }

  if (diffInSeconds < 60) {
    const s = diffInSeconds;
    return `${s}s`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    const m = diffInMinutes;
    return `${m}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const h = diffInHours;
    return `${h}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    const d = diffInDays;
    return `${d}d`;
  }

  if (diffInDays < 30) {
    const w = Math.floor(diffInDays / 7);
    return `${w}w`;
  }

  if (diffInDays < 365) {
    const mo = Math.floor(diffInDays / 30);
    return `${mo}mo`;
  }

  const y = Math.floor(diffInDays / 365);
  return `${y}y`;
};

// Updated to use slug for finding posts
export const findPostById = (postId, stories) => {
  return stories.find(post => post.slug === postId);
};

export const toggleDescription = (index) => {
  const descElement = document.getElementById(`desc-${index}`);
  const readMoreBtn = document.getElementById(`readmore-${index}`);
  
  if (descElement.classList.contains('expanded')) {
    descElement.classList.remove('expanded');
    readMoreBtn.textContent = 'Read more';
  } else {
    descElement.classList.add('expanded');
    readMoreBtn.textContent = 'Read less';
  }
};

// FIXED: Updated createBubbles function to position bubbles inside the hologram
export const createBubbles = (hologramId) => {
  const hologram = document.getElementById(hologramId);
  if (!hologram) return;
  
  const bubbleCount = 50; // Increased total bubble count
  
  for (let i = 0; i < bubbleCount; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Randomize size between 5px and 20px
    const size = Math.random() * 15 + 5;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    
    // Position bubbles: 50% inside, 50% outside (increased outside ratio)
    const position = Math.random();
    let left, top;
    
    if (position < 0.5) {
      // INSIDE the hologram (50% of bubbles)
      left = Math.random() * 90 + 5; // 5% to 95%
      top = Math.random() * 90 + 5;  // 5% to 95%
    } else {
      // OUTSIDE the hologram (50% of bubbles - increased from 40%)
      const edge = Math.random();
      
      if (edge < 0.25) { // Left edge
        left = Math.random() * -20 - 5; // -5% to -25%
        top = Math.random() * 120;
      } else if (edge < 0.5) { // Right edge
        left = Math.random() * 20 + 105; // 105% to 125%
        top = Math.random() * 120;
      } else if (edge < 0.75) { // Top edge
        left = Math.random() * 120;
        top = Math.random() * -20 - 5; // -5% to -25%
      } else { // Bottom edge
        left = Math.random() * 120;
        top = Math.random() * 20 + 105; // 105% to 125%
      }
    }
    
    bubble.style.left = `${left}%`;
    bubble.style.top = `${top}%`;
    
    // Enhanced colors with more variety
    const colors = [
      'rgba(0, 212, 255, 0.7)',  // Neon blue
      'rgba(157, 0, 255, 0.7)',  // Neon purple
      'rgba(255, 107, 53, 0.7)', // Accent orange
      'rgba(255, 0, 128, 0.7)',  // Neon pink
      'rgba(0, 200, 83, 0.7)',   // Neon green
      'rgba(255, 215, 0, 0.7)',  // Gold
      'rgba(0, 255, 255, 0.7)'   // Cyan
    ];
    
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];
    bubble.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
    
    // Randomize animation duration and delay
    const duration = Math.random() * 8 + 8; // 8-16 seconds
    const delay = Math.random() * 5;
    
    // Use different animation patterns
    if (Math.random() > 0.5) {
      bubble.style.animation = `bubble-float ${duration}s infinite ease-in-out ${delay}s`;
    } else {
      bubble.style.animation = `bubble-float-out ${duration}s infinite ease-in-out ${delay}s`;
    }
    
    hologram.appendChild(bubble);
  }
  
  // Create new bubbles periodically
  setInterval(() => {
    const currentBubbles = hologram.querySelectorAll('.bubble');
    if (currentBubbles.length < bubbleCount) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      
      // Recreate a bubble with same logic
      const size = Math.random() * 15 + 5;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      
      // 60% inside
      if (Math.random() < 0.6) {
        bubble.style.left = `${Math.random() * 90 + 5}%`;
        bubble.style.top = `${Math.random() * 90 + 5}%`;
      } else {
        const edge = Math.random();
        if (edge < 0.25) {
          bubble.style.left = `${Math.random() * -20 - 5}%`;
          bubble.style.top = `${Math.random() * 120}%`;
        } else if (edge < 0.5) {
          bubble.style.left = `${Math.random() * 20 + 105}%`;
          bubble.style.top = `${Math.random() * 120}%`;
        } else if (edge < 0.75) {
          bubble.style.left = `${Math.random() * 120}%`;
          bubble.style.top = `${Math.random() * -20 - 5}%`;
        } else {
          bubble.style.left = `${Math.random() * 120}%`;
          bubble.style.top = `${Math.random() * 20 + 105}%`;
        }
      }
      
      const colors = [
        'rgba(0, 212, 255, 0.7)',
        'rgba(157, 0, 255, 0.7)',
        'rgba(255, 107, 53, 0.7)',
        'rgba(255, 0, 128, 0.7)',
        'rgba(0, 200, 83, 0.7)',
        'rgba(255, 215, 0, 0.7)',
        'rgba(0, 255, 255, 0.7)'
      ];
      
      const color1 = colors[Math.floor(Math.random() * colors.length)];
      const color2 = colors[Math.floor(Math.random() * colors.length)];
      bubble.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
      
      const duration = Math.random() * 8 + 8;
      const delay = Math.random() * 5;
      
      if (Math.random() > 0.5) {
        bubble.style.animation = `bubble-float ${duration}s infinite ease-in-out ${delay}s`;
      } else {
        bubble.style.animation = `bubble-float-out ${duration}s infinite ease-in-out ${delay}s`;
      }
      
      hologram.appendChild(bubble);
    }
  }, 5000);
};

/**
 * Strip images from verses in stories to optimize feed loading
 * Keeps verse data (count, id, etc) but removes the images array
 * Images will be lazy-loaded when user opens VerseViewer
 * 
 * @param {Array|Object} stories - Story or array of stories to process
 * @returns {Array|Object} - Same structure but with verse images removed
 */
export const stripVerseImages = (stories) => {
  // Handle single story object
  if (!Array.isArray(stories)) {
    return stripVerseImagesFromStory(stories);
  }
  
  // Handle array of stories
  return stories.map(story => stripVerseImagesFromStory(story));
};

/**
 * Strip images from a single story's verses
 */
const stripVerseImagesFromStory = (story) => {
  if (!story) return story;
  
  // If story has verses array, remove the images from each verse
  if (Array.isArray(story.verses)) {
    return {
      ...story,
      verses: story.verses.map(verse => {
        // Keep all verse data except images
        const { images, ...verseWithoutImages } = verse;
        return verseWithoutImages;
      })
    };
  }
  
  // If no verses array, return story as-is
  return story;
};





