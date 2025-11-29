'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { commentsApi, absoluteUrl } from '../../../lib/api';

const CommentModal = ({ 
  isOpen, 
  onClose, 
  post, 
  updateCommentCount 
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [error, setError] = useState('');
  const [modalPosition, setModalPosition] = useState(0); // 0 = closed, 1 = open
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [newCommentId, setNewCommentId] = useState(null); // Track newly added comment
  
  const replyInputRef = useRef(null);
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const dragHandleRef = useRef(null);
  const commentRefs = useRef({}); // Refs for each comment
  const commentTextareaRef = useRef(null);
  const replyTextareaRef = useRef(null);
  
  // Get current user and auth helpers from AuthContext
  const { currentUser, isAuthenticated, refreshAuth } = useAuth();

  // Helper function to get display name based on account type
  const getDisplayName = (user) => {
    if (!user) return 'Unknown';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.display_name) {
      return user.display_name;
    }
    if (user.account_type === 'brand' && user.brand_name) {
      return user.brand_name;
    }
    if (user.username) {
      return user.username;
    }
    if (user.name) {
      return user.name;
    }
    return 'Unknown';
  };

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle modal open/close animation
  useEffect(() => {
    if (isOpen) {
      setModalPosition(1);
    } else {
      setModalPosition(0);
    }
  }, [isOpen]);

  // Scroll to new comment when it's added
  useEffect(() => {
    if (newCommentId && commentRefs.current[newCommentId]) {
      setTimeout(() => {
        commentRefs.current[newCommentId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        setNewCommentId(null); // Reset after scrolling
      }, 100);
    }
  }, [newCommentId, comments]);

  // Fetch comments when modal opens
  useEffect(() => {
    if (isOpen && post?.slug) {
      fetchCommentsData();
    } else {
      // Reset state when modal closes
      setComments([]);
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
      setExpandedReplies({});
      setError('');
      setNewCommentId(null);
    }
  }, [isOpen, post?.slug]);

  // Auto-resize textarea
  const adjustTextareaHeight = (textarea) => {
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; // Max height for ~3 rows
  };

  // Adjust textarea heights when content changes
  useEffect(() => {
    adjustTextareaHeight(commentTextareaRef.current);
  }, [newComment]);

  useEffect(() => {
    adjustTextareaHeight(replyTextareaRef.current);
  }, [replyContent]);
  
  const fetchCommentsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await commentsApi.fetchComments(post.slug);
      
      // Handle different response formats
      let commentsArray = [];
      if (Array.isArray(response)) {
        commentsArray = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        commentsArray = response.results;
      } else if (response && Array.isArray(response.comments)) {
        commentsArray = response.comments;
      }
      

      // Sort comments by score (engagement + recency) and then by creation time
      const sortedComments = [...commentsArray].sort((a, b) => {
        const scoreA = calculateCommentScore(a);
        const scoreB = calculateCommentScore(b);

        // First sort by score (descending)
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        // If scores are equal, sort by creation time (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setComments(sortedComments);
    } catch (error) {
      setError('Failed to load comments. Please try again.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [post?.slug]);
  
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    try {
      setError('');
      const commentData = {
        story: post.slug, // Send the slug
        content: newComment.trim(),
      };
      // Ensure user is authenticated before allowing comment
      if (!isAuthenticated) {
        // try a quick refresh (useful if auth changed)
        await refreshAuth?.();
        if (!isAuthenticated) {
          setError('You must be logged in to comment');
          return;
        }
      }
      const newCommentData = await commentsApi.createComment(commentData);
      
      // Add the new comment to the list and re-sort
      const updatedComments = [...comments, newCommentData].sort((a, b) => {
        const scoreA = calculateCommentScore(a);
        const scoreB = calculateCommentScore(b);
        
        // First sort by score (descending)
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        // If scores are equal, sort by creation time (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setComments(updatedComments);
      setNewComment('');
      
      // Set the new comment ID to scroll to it
      setNewCommentId(newCommentData.public_id);
      
      // Update comment count in parent component
      updateCommentCount(post.slug, 1);
    } catch (error) {
      if (error.message === 'Authentication required. Please log in to perform this action.' ||
          error.message === 'You must be logged in to comment') {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to post comment. Please try again.');
      }
    }
  };
  
  const handleReplyClick = (comment) => {
    setReplyingTo(comment);
    setReplyContent(`@${getDisplayName(comment.author)} `);
    
    // Focus on the reply input immediately
    setTimeout(() => {
      if (replyTextareaRef.current) {
        replyTextareaRef.current.focus();
        // Move cursor to end of text
        replyTextareaRef.current.setSelectionRange(
          replyTextareaRef.current.value.length,
          replyTextareaRef.current.value.length
        );
      }
    }, 10);
  };
  
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };
  
  const handleAddReply = async (parentComment) => {
    if (!replyContent.trim()) {
      setError('Reply cannot be empty');
      return;
    }

    try {
      // Ensure user is authenticated before replying
      if (!isAuthenticated) {
        await refreshAuth?.();
        if (!isAuthenticated) {
          setError('You must be logged in to reply');
          return;
        }
      }

      setError('');
      const replyData = {
        story: post.slug, // Send the slug
        parent: parentComment.public_id, // Send the public_id of the parent comment
        content: replyContent.trim(),
      };
      
      const newReply = await commentsApi.createComment(replyData);
      
      // Update the parent comment with the new reply
      const updatedComments = comments.map(comment => {
        if (comment.public_id === parentComment.public_id) {
          return {
            ...comment,
            replies: [newReply, ...(comment.replies || [])],
            reply_count: (comment.reply_count || 0) + 1
          };
        }
        return comment;
      });
      
      // Re-sort comments after adding a reply (since the engagement score changed)
      const sortedComments = [...updatedComments].sort((a, b) => {
        const scoreA = calculateCommentScore(a);
        const scoreB = calculateCommentScore(b);
        
        // First sort by score (descending)
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        // If scores are equal, sort by creation time (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setComments(sortedComments);
      setReplyingTo(null);
      setReplyContent('');
      
      // Set the new comment ID to scroll to it
      setNewCommentId(newReply.public_id);
      
      // Update comment count in parent component
      updateCommentCount(post.slug, 1);
    } catch (error) {
      if (error.message === 'Authentication required. Please log in to perform this action.' ||
          error.message === 'You must be logged in to comment' ||
          error.message === 'You must be logged in to reply') {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to post reply. Please try again.');
      }
    }
  };
  
  const handleToggleReplies = async (comment) => {
    if (!comment || !comment.public_id) {
      setError('Invalid comment. Please try again.');
      return;
    }
    
    const commentId = comment.public_id;
    
    if (expandedReplies[commentId]) {
      setExpandedReplies(prev => ({
        ...prev,
        [commentId]: false
      }));
      return;
    }
    
    try {
      setLoadingReplies(prev => ({
        ...prev,
        [commentId]: true
      }));
      
      const response = await commentsApi.fetchCommentReplies(commentId);
      
      let repliesArray = [];
      if (Array.isArray(response)) {
        repliesArray = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        repliesArray = response.results;
      } else if (response && Array.isArray(response.replies)) {
        repliesArray = response.replies;
      }
      
      
      const updatedComments = comments.map(c => {
        if (c.public_id === commentId) {
          return {
            ...c,
            replies: repliesArray
          };
        }
        return c;
      });
      
      setComments(updatedComments);
      setExpandedReplies(prev => ({
        ...prev,
        [commentId]: true
      }));
    } catch (error) {
      setError('Failed to load replies. Please try again.');
    } finally {
      setLoadingReplies(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m`;
    
    return 'just now';
  };

  // Calculate comment score based on engagement and recency
  const calculateCommentScore = (comment) => {
    const now = new Date();
    const commentDate = new Date(comment.created_at);
    const hoursAgo = (now - commentDate) / (1000 * 60 * 60); // Convert to hours
    
    // Base score for every comment
    const baseScore = 500;
    
    // Recency score: decreases over time
    let recencyScore = 0;
    if (hoursAgo < 24) {
      recencyScore = 500 - (hoursAgo * 20); // 500 at 0 hours, 0 at 25 hours
    }
    
    // Engagement score: 500 points per reply
    const engagementScore = (comment.reply_count || 0) * 500;
    
    // Temporary boost for new comments without replies (first hour)
    let newCommentBoost = 0;
    if (comment.reply_count === 0 && hoursAgo < 1) {
      newCommentBoost = 10000; // Push new comments to the top
    }
    
    // Total score
    return baseScore + recencyScore + engagementScore + newCommentBoost;
  };

  // Drag handlers for mobile
  const handleDragStart = (e) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(0);
  };

  const handleDragMove = (e) => {
    if (!isDragging || !isMobile) return;
    
    const deltaY = e.touches[0].clientY - startY; // Positive for downward drag
    setCurrentY(deltaY);
  };

  const handleDragEnd = () => {
    if (!isDragging || !isMobile) return;
    
    setIsDragging(false);
    
    // Only close if dragged downward more than 50px
    if (currentY > 50) {
      onClose();
    } else {
      setCurrentY(0);
    }
  };

  // Calculate modal styles based on position and dragging
  const getModalStyle = () => {
    if (isMobile) {
      return {
        transform: `translateY(${modalPosition === 0 ? '100%' : '0%'}) translateY(${isDragging ? Math.min(currentY, 100) : 0}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      };
    } else {
      return {
        transform: modalPosition === 0 ? 'scale(0.9)' : 'scale(1)',
        opacity: modalPosition,
        transition: 'all 0.3s ease-out'
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-20 flex items-start md:items-center justify-center bg-black/80 backdrop-blur-lg"
      onClick={onClose}
    >
      {/* Modal container */}
      <div 
        ref={modalRef}
        className={`relative w-full h-full ${isMobile ? 'max-w-md pb-6' : 'max-w-2xl'} bg-gradient-to-br from-gray-900 to-black rounded-t-2xl md:rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 scale-95 animate-scaleIn`}
        style={{ ...getModalStyle(), height: isMobile ? '100dvh' : '100vh', maxHeight: isMobile ? '100dvh' : '100vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated neon border effect */}
        <div className="absolute inset-0 rounded-t-2xl md:rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-t-2xl md:rounded-2xl border-2 border-cyan-500/30 animate-pulse"></div>
          <div className="absolute inset-0 rounded-t-2xl md:rounded-2xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 rounded-t-2xl md:rounded-2xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
        </div>
        
        {/* Drag handle (mobile only) */}
        {isMobile && (
          <div 
            ref={dragHandleRef}
            className="flex justify-center pt-3 pb-2 relative z-10 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
          </div>
        )}
        
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
              <span className="inline-block w-6 h-6">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-cyan-400">
                  <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
                </svg>
              </span>
            </div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 font-orbitron">
              COMMENTS
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex items-center justify-center transition-all hover:from-blue-700/50 hover:to-purple-700/50 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/20 z-50"
          >
            <span className="inline-block w-5 h-5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 12 12z"/>
              </svg>
            </span>
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm relative z-10">
            {error}
          </div>
        )}
        
        {/* Post Preview */}
        <div className="p-6 border-b border-cyan-500/20 bg-black/30 relative z-10">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
              {(() => {
                const creator = post.creator || {};
                const imgUrl = creator.profile_image_url || creator.profile_image || creator.profileImageUrl || creator.profileImage || null;
                if (imgUrl) {
                  return (
                    <img
                      src={absoluteUrl(imgUrl)}
                      alt={getDisplayName(creator)}
                      className="w-full h-full object-cover rounded-full"
                    />
                  );
                }
                return getDisplayName(creator)?.charAt(0).toUpperCase() || 'U';
              })()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate overflow-ellipsis whitespace-nowrap block max-w-xs" title={post.title}>{post.title}</h3>
              <p className="text-gray-400 text-sm">{getDisplayName(post.creator)}</p>
            </div>
          </div>
        </div>
        
        {/* Comments Section */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6 relative z-10"
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-pulse text-cyan-400">Loading comments...</div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div 
                key={`comment-${comment.public_id}`} 
                ref={el => commentRefs.current[comment.public_id] = el}
                className="space-y-4"
              >
                {/* Comment */}
                <div className="relative bg-gradient-to-b from-gray-800/50 to-black/50 rounded-xl p-4 border border-cyan-500/20 backdrop-blur-sm">
                  <div className="flex space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                      {comment.author?.profile_image_url ? (
                        <img
                          src={absoluteUrl(comment.author.profile_image_url)}
                          alt={getDisplayName(comment.author)}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        getDisplayName(comment.author)?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{getDisplayName(comment.author)}</span>
                        <span className="text-gray-500 text-sm">{formatTimeAgo(comment.created_at)}</span>
                        {comment.reply_count > 0 && (
                          <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded-full">
                            {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                        {calculateCommentScore(comment) > 10000 && (
                          <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-gray-200 mt-1">{comment.content}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <button 
                          onClick={() => handleReplyClick(comment)}
                          className="flex items-center space-x-1 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <span className="inline-block w-4 h-4">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                            </svg>
                          </span>
                          <span className="text-sm">Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reply Input (when replying to this comment) */}
                  {replyingTo?.public_id === comment.public_id && (
                    <div key={`reply-input-${comment.public_id}`} className="mt-4 ml-12 flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <textarea
                          ref={replyTextareaRef}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="flex-1 bg-slate-900/60 border border-gray-700 rounded-xl text-white px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none min-h-[40px] max-h-[120px]"
                          placeholder="Write a reply..."
                          autoFocus
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddReply(comment);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddReply(comment)}
                          disabled={!replyContent.trim()}
                          className="p-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed self-end"
                        >
                          <span className="inline-block w-5 h-5">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                          </span>
                        </button>
                      </div>
                      <button
                        onClick={handleCancelReply}
                        className="ml-auto text-gray-400 hover:text-gray-200 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  {/* Replies Section */}
                  {comment.reply_count > 0 && (
                    <div key={`replies-section-${comment.public_id}`} className="mt-3 ml-12">
                      <button
                        onClick={() => handleToggleReplies(comment)}
                        disabled={loadingReplies[comment.public_id]}
                        className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center space-x-1 disabled:opacity-50"
                      >
                        <span>
                          {expandedReplies[comment.public_id] ? 'Hide replies' : `View replies`}
                        </span>
                        {loadingReplies[comment.public_id] && (
                          <span className="ml-2 animate-pulse">Loading...</span>
                        )}
                      </button>
                      
                      {expandedReplies[comment.public_id] && comment.replies && (
                        <div key={`replies-list-${comment.public_id}`} className="mt-3 space-y-3">
                          {comment.replies.map(reply => (
                            <div 
                              key={`reply-${reply.public_id}`}
                              ref={el => commentRefs.current[reply.public_id] = el}
                              className="relative bg-gradient-to-b from-gray-700/30 to-black/30 rounded-xl p-3 border border-purple-500/20 backdrop-blur-sm"
                            >
                              <div className="flex space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                                  {reply.author?.profile_image_url ? (
                                    <img
                                      src={absoluteUrl(reply.author.profile_image_url)}
                                      alt={getDisplayName(reply.author)}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    getDisplayName(reply.author)?.charAt(0).toUpperCase() || 'U'
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white">{getDisplayName(reply.author)}</span>
                                    <span className="text-gray-500 text-sm">{formatTimeAgo(reply.created_at)}</span>
                                  </div>
                                  <p className="text-gray-200 mt-1">{reply.content}</p>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <button 
                                      onClick={() => handleReplyClick(reply)}
                                      className="flex items-center space-x-1 text-gray-400 hover:text-purple-400 transition-colors"
                                    >
                                      <span className="inline-block w-4 h-4">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                          <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                                        </svg>
                                      </span>
                                      <span className="text-sm">Reply</span>
                                    </button>
                                  </div>
                                  
                                  {replyingTo?.public_id === reply.public_id && (
                                    <div key={`reply-to-reply-${reply.public_id}`} className="mt-2 flex flex-col space-y-2">
                                      <div className="flex space-x-2">
                                        <textarea
                                          value={replyContent}
                                          onChange={(e) => setReplyContent(e.target.value)}
                                          className="flex-1 bg-slate-800/60 border border-gray-700 rounded-xl text-white px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none min-h-[40px] max-h-[120px]"
                                          placeholder="Write a reply..."
                                          autoFocus
                                          rows={1}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleAddReply(reply);
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => handleAddReply(reply)}
                                          disabled={!replyContent.trim()}
                                          className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed self-end"
                                        >
                                          <span className="inline-block w-5 h-5">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                            </svg>
                                          </span>
                                        </button>
                                      </div>
                                      <button
                                        onClick={handleCancelReply}
                                        className="ml-auto text-gray-400 hover:text-gray-200 text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Add Comment Section */}
        <div className="p-2 border-t border-cyan-500/30 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md relative z-10">
          <div className="flex flex-col gap-2">
            {/* Emoji Reaction Row */}
            <div className="flex gap-2 mb-2 justify-center">
              {['🔥','😂','❤️','😍','😮','👍','🙏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="text-2xl px-2 py-1 rounded-full bg-slate-800/60 hover:bg-cyan-500/30 transition-all duration-200 shadow hover:scale-110"
                  onClick={() => setNewComment((prev) => prev + emoji)}
                  title={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex-1 flex space-x-3">
              <textarea
                ref={commentTextareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-900/60 border border-gray-700 rounded-xl text-white px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 resize-none min-h-[40px] max-h-[120px]"
                placeholder="Add a comment..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="p-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                <span className="inline-block w-5 h-5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
      </div>
    </div>
  );
};

export default CommentModal;