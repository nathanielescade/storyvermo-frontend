'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  const [topLevelParentId, setTopLevelParentId] = useState(null); // FIX: Track top-level comment for nested replies
  const [error, setError] = useState('');
  const [modalPosition, setModalPosition] = useState(0);
  const [newCommentId, setNewCommentId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  
  const replyInputRef = useRef(null);
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const commentRefs = useRef({});
  const commentTextareaRef = useRef(null);
  const commentCaretRef = useRef({ start: 0, end: 0 });
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null);

  const EMOJIS = ['👍','❤️','😂','🔥','✨','🌿','🎉','🤩','🌌','🙌','😅','🤗','😎','💯'];
  const EMOJI_BAR = ['👍','❤️','😂','🔥','✨','🌿','🎉','🤩','🌌','🙌'];
  const menuRef = useRef(null);
  
  const { currentUser, isAuthenticated, refreshAuth } = useAuth();

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

  const router = useRouter();

  const renderContentWithMention = (text, parentComment = null, replyObj = null) => {
    if (!text || typeof text !== 'string') return <p className="text-gray-200 mt-1">{text}</p>;

    const original = text.trimStart();
    if (!original.startsWith('@')) return <p className="text-gray-200 mt-1 break-words">{text}</p>;

    const candidates = [];
    if (parentComment && parentComment.author) {
      candidates.push({ name: getDisplayName(parentComment.author).trim(), username: parentComment.author.username });
    }
    if (parentComment && Array.isArray(parentComment.replies)) {
      parentComment.replies.forEach(r => {
        if (r && r.author) candidates.push({ name: getDisplayName(r.author).trim(), username: r.author.username });
      });
    }

    const unique = [];
    const seen = new Set();
    candidates.forEach(c => {
      if (!c || !c.name) return;
      const key = c.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(c);
    });
    unique.sort((a, b) => b.name.length - a.name.length);

    let match = null;
    for (const c of unique) {
      const lower = original.slice(1).toLowerCase();
      if (lower.startsWith(c.name.toLowerCase())) {
        const nextChar = lower.charAt(c.name.length) || '';
        if (nextChar === '' || /\s|[.,:;!?]/.test(nextChar)) {
          match = c;
          break;
        }
      }
    }

    let mentionToken = null;
    let rest = '';
    let profileUsername = null;

    if (match) {
      mentionToken = match.name;
      profileUsername = match.username || null;
      rest = original.substring(1 + mentionToken.length).replace(/^\s+/, '');
    } else {
      const m = original.match(/^@(\S+)\s*(.*)$/s);
      if (!m) return <p className="text-gray-200 mt-1 break-words">{text}</p>;
      mentionToken = m[1];
      rest = m[2] || '';

      if (parentComment) {
        const found = (parentComment.replies || []).find(r => getDisplayName(r.author).toLowerCase() === mentionToken.toLowerCase());
        if (found && found.author && found.author.username) profileUsername = found.author.username;
        else if (parentComment.author && getDisplayName(parentComment.author).toLowerCase() === mentionToken.toLowerCase()) profileUsername = parentComment.author.username;
      }
    }

    const handleClickProfile = (e) => {
      e.stopPropagation();
      if (!profileUsername) return;
      try { router.push(`/${profileUsername}`); } catch (err) { window.location.href = `/${profileUsername}`; }
    };

    return (
      <p className="text-gray-200 mt-1 break-words">
        <span
          role="link"
          tabIndex={0}
          onClick={handleClickProfile}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClickProfile(e); }}
          className={`inline-block mr-1 ${profileUsername ? 'text-cyan-400 hover:underline cursor-pointer font-semibold' : 'text-yellow-300'}`}
          title={profileUsername ? `Open ${mentionToken}'s profile` : mentionToken}
        >
          @{mentionToken}
        </span>
        <span>{rest}</span>
      </p>
    );
  };

  useEffect(() => {
    if (isOpen) {
      setModalPosition(1);
      document.body.style.overflow = 'hidden';
    } else {
      setModalPosition(0);
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && post?.slug) {
      fetchCommentsData();
    } else {
      setNewComment('');
      setReplyingTo(null);
      setTopLevelParentId(null); // FIX: Reset top-level parent when modal closes
      setError('');
      setNewCommentId(null);
    }
  }, [isOpen, post?.slug]);

  const adjustTextareaHeight = (textarea) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    adjustTextareaHeight(commentTextareaRef.current);
  }, [newComment]);

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const openEmojiPicker = (target) => {
    setEmojiTarget(target);
    setEmojiPickerOpen(true);
  };

  const insertEmojiAtCursor = (emoji) => {
    try {
      const commentTa = commentTextareaRef.current;

      if (commentTa) {
        const caret = commentCaretRef.current || {};
        const start = (typeof caret.start === 'number' ? caret.start : (commentTa.selectionStart ?? commentTa.value.length));
        const end = (typeof caret.end === 'number' ? caret.end : (commentTa.selectionEnd ?? start));
        const newVal = (newComment || '').slice(0, start) + emoji + (newComment || '').slice(end);
        setNewComment(newVal);
        requestAnimationFrame(() => {
          try {
            if (document.activeElement === commentTa) {
              const pos = start + emoji.length;
              commentTa.setSelectionRange(pos, pos);
            }
          } catch (e) {}
        });
        commentCaretRef.current = { start: start + emoji.length, end: start + emoji.length };
        return;
      }

      setNewComment((s) => (s || '') + emoji);
    } catch (err) {
      setNewComment((s) => (s || '') + emoji);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);
  
  const fetchCommentsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await commentsApi.fetchComments(post.slug);
      
      let commentsArray = [];
      if (Array.isArray(response)) {
        commentsArray = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        commentsArray = response.results;
      } else if (response && Array.isArray(response.comments)) {
        commentsArray = response.comments;
      }
      
      commentsArray = commentsArray.map(comment => ({
        ...comment,
        replies: comment.replies || []
      }));

      const sortedComments = [...commentsArray].sort((a, b) => {
        const scoreA = calculateCommentScore(a);
        const scoreB = calculateCommentScore(b);

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        return new Date(b.created_at) - new Date(a.created_at);
      });

      setComments(sortedComments);
      
      const repliesPromises = sortedComments.map(comment =>
        commentsApi.fetchCommentReplies(comment.public_id)
          .then(repliesData => ({ commentId: comment.public_id, repliesData }))
          .catch(() => ({ commentId: comment.public_id, repliesData: [] }))
      );
      
      Promise.all(repliesPromises).then(results => {
        let updatedComments = [...sortedComments];
        results.forEach(({ commentId, repliesData }) => {
          let repliesArray = [];
          if (Array.isArray(repliesData)) {
            repliesArray = repliesData;
          } else if (repliesData && repliesData.results && Array.isArray(repliesData.results)) {
            repliesArray = repliesData.results;
          } else if (repliesData && Array.isArray(repliesData.replies)) {
            repliesArray = repliesData.replies;
          }
          
          updatedComments = updatedComments.map(comment => 
            comment.public_id === commentId 
              ? { ...comment, replies: repliesArray }
              : comment
          );
        });
        
        setComments(updatedComments);
      });
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
        story: post.slug,
        content: newComment.trim(),
      };
      if (!isAuthenticated) {
        await refreshAuth?.();
        if (!isAuthenticated) {
          try {
            window.dispatchEvent(new CustomEvent('auth:open', { detail: {
              type: 'comment',
              data: { storySlug: post.slug, content: commentData.content, action: 'add' }
            } }));
          } catch (e) {
            setError('You must be logged in to comment');
          }
          return;
        }
      }
      const newCommentData = await commentsApi.createComment(commentData);
      
      const updatedComments = [...comments, newCommentData].sort((a, b) => {
        const scoreA = calculateCommentScore(a);
        const scoreB = calculateCommentScore(b);
        
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setComments(updatedComments);
      setNewComment('');
      
      setNewCommentId(newCommentData.public_id);
      
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
  
  const handleReplyClick = (comment, parentCommentId = null) => {
    // FIX: Accept parentCommentId parameter to track the top-level comment
    setReplyingTo(comment);
    const mention = `@${getDisplayName(comment.author)} `;
    setNewComment(mention);
    
    // FIX: Set top-level parent ID based on whether this is a reply to a reply
    // If parentCommentId is provided, use it (replying to a reply)
    // Otherwise use the comment's own ID (replying to a top-level comment)
    setTopLevelParentId(parentCommentId || comment.public_id);
    
    setTimeout(() => {
      if (commentTextareaRef.current) {
        commentTextareaRef.current.focus();
        const len = (commentTextareaRef.current.value || '').length;
        try { commentTextareaRef.current.setSelectionRange(len, len); } catch (e) {}
      }
    }, 10);
  };
  
  const handleCancelReply = () => {
    setReplyingTo(null);
    setTopLevelParentId(null); // FIX: Reset top-level parent
    setNewComment('');
  };

  const handleDeleteComment = async (commentOrReply) => {
    if (!commentOrReply || !commentOrReply.public_id) {
      setError('Invalid comment. Please try again.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await commentsApi.deleteComment(commentOrReply.public_id);
      
      const updatedComments = comments.map(comment => {
        if (comment.public_id === commentOrReply.public_id) {
          return null;
        }
        if (comment.replies && Array.isArray(comment.replies)) {
          return {
            ...comment,
            replies: comment.replies.filter(r => r.public_id !== commentOrReply.public_id),
            reply_count: (comment.reply_count || 0) - (comment.replies.some(r => r.public_id === commentOrReply.public_id) ? 1 : 0)
          };
        }
        return comment;
      }).filter(c => c !== null);
      
      setComments(updatedComments);
      setOpenMenu(null);
      updateCommentCount(post.slug, -1);
    } catch (error) {
      setError('Failed to delete comment. Please try again.');
    }
  };

  const handleEditComment = (commentOrReply) => {
    if (!commentOrReply || !commentOrReply.public_id) {
      setError('Invalid comment. Please try again.');
      return;
    }
    
    setEditingComment(commentOrReply);
    setOpenMenu(null);
  };

  const handleSaveEdit = async (commentOrReply) => {
    if (!commentOrReply.content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      await commentsApi.updateComment(commentOrReply.public_id, {
        content: commentOrReply.content
      });
      
      const updatedComments = comments.map(comment => {
        if (comment.public_id === commentOrReply.public_id) {
          return commentOrReply;
        }
        if (comment.replies && Array.isArray(comment.replies)) {
          return {
            ...comment,
            replies: comment.replies.map(r => r.public_id === commentOrReply.public_id ? commentOrReply : r)
          };
        }
        return comment;
      });
      
      setComments(updatedComments);
      setEditingComment(null);
    } catch (error) {
      setError('Failed to update comment. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  const isCommentOwner = (commentAuthor) => {
    if (!currentUser || !commentAuthor) return false;
    return currentUser.id === commentAuthor.id || currentUser.username === commentAuthor.username;
  };
  
  const handleAddReply = async (parentComment) => {
    const content = (newComment || '').trim();
    if (!content) {
      setError('Reply cannot be empty');
      return;
    }

    try {
      if (!isAuthenticated) {
        await refreshAuth?.();
        if (!isAuthenticated) {
          try {
            window.dispatchEvent(new CustomEvent('auth:open', { detail: {
              type: 'comment',
              data: { storySlug: post.slug, content: (newComment || '').trim(), action: 'reply', parentId: parentComment.public_id }
            } }));
          } catch (e) {
            setError('You must be logged in to reply');
          }
          return;
        }
      }

      setError('');
      const replyData = {
        story: post.slug,
        parent: parentComment.public_id,
        content,
      };

      const newReply = await commentsApi.createComment(replyData);

      // FIX: Use the tracked topLevelParentId instead of trying to derive it from parentComment
      // This ensures nested replies are added to the correct top-level comment
      const actualTopLevelParentId = topLevelParentId || parentComment.public_id;

      const updatedComments = comments.map(comment => {
        if (comment.public_id === actualTopLevelParentId) {
          const updatedReplies = comment.replies ? [newReply, ...comment.replies] : [newReply];
          return {
            ...comment,
            replies: updatedReplies,
            reply_count: (comment.reply_count || 0) + 1
          };
        }
        return comment;
      });
      
      const sortedComments = [...updatedComments].sort((a, b) => {
        const scoreA = calculateCommentScore(a);
        const scoreB = calculateCommentScore(b);
        
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setComments(sortedComments);

      setTimeout(() => {
        try {
          const el = typeof document !== 'undefined' ? document.getElementById(`comment-${actualTopLevelParentId}`) : null;
          if (el && contentRef?.current) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch (e) {
          // ignore
        }
      }, 80);

      setReplyingTo(null);
      setTopLevelParentId(null); // FIX: Reset top-level parent after reply is added
      setNewComment('');
      
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

  useEffect(() => {
    const handler = async (e) => {
      try {
        const detail = e?.detail || {};
        if (!detail || detail.type !== 'comment') return;
        const data = detail.data || {};
        if (!data || data.storySlug !== post?.slug) return;

        try { await refreshAuth?.(); } catch (err) {}

        if (data.content) {
          setNewComment(data.content);
        }

        if (data.action === 'reply' && data.parentId) {
          const parent = comments.find(c => c.public_id === data.parentId);
          if (parent) {
            setReplyingTo(parent);
            setTopLevelParentId(parent.public_id); // FIX: Set top-level parent for resumed reply
            setTimeout(() => handleAddReply(parent), 80);
            return;
          }
        }

        setTimeout(() => handleAddComment(), 80);
      } catch (err) {
        // ignore errors from auth handler
      }
    };

    window.addEventListener('auth:success', handler);
    return () => window.removeEventListener('auth:success', handler);
  }, [post?.slug, comments, handleAddComment, handleAddReply, refreshAuth]);
  
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

  const calculateCommentScore = (comment) => {
    const now = new Date();
    const commentDate = new Date(comment.created_at);
    const hoursAgo = (now - commentDate) / (1000 * 60 * 60);
    
    const baseScore = 500;
    
    let recencyScore = 0;
    if (hoursAgo < 24) {
      recencyScore = 500 - (hoursAgo * 20);
    }
    
    const engagementScore = (comment.reply_count || 0) * 500;
    
    let newCommentBoost = 0;
    if (comment.reply_count === 0 && hoursAgo < 1) {
      newCommentBoost = 10000;
    }
    
    return baseScore + recencyScore + engagementScore + newCommentBoost;
  };

  const getModalStyle = () => {
    return {
      transform: modalPosition === 0 ? 'scale(0.9)' : 'scale(1)',
      opacity: modalPosition,
      transition: 'all 0.3s ease-out'
    };
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/80 backdrop-blur-lg overflow-hidden"
      onClick={onClose}
    >
      {/* Modal container */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col mx-1 my-8"
        style={{ ...getModalStyle(), maxHeight: 'calc(100vh - 4rem)', height: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated neon border effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/30 animate-pulse"></div>
          <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 rounded-2xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
        </div>
        
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
        <div className="py-2 px-6 border-b border-cyan-500/20 bg-black/30 relative z-10">
          <div className="flex items-start space-x-3">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
              {(() => {
                const creator = post.creator || {};
                const imgUrl = creator.profile_image_url || creator.profile_image || creator.profileImageUrl || creator.profileImage || null;
                if (imgUrl) {
                  return (
                    <Image
                      src={absoluteUrl(imgUrl)}
                      alt={getDisplayName(creator)}
                      width={40}
                      height={40}
                      className="object-cover rounded-full"
                      quality={75}
                    />
                  );
                }
                return (creator.first_name?.charAt(0) || getDisplayName(creator)?.charAt(0) || 'U').toUpperCase();
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
          className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10"
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
                  className="space-y-4"
                >
                  {/* Comment */}
                  <div id={`comment-${comment.public_id}`} className="relative bg-gradient-to-b from-gray-800/50 to-black/50 rounded-xl p-4 border border-cyan-500/20 backdrop-blur-sm">
                  <div className="flex space-x-3">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                      {comment.author?.profile_image_url ? (
                        <Image
                          src={absoluteUrl(comment.author.profile_image_url)}
                          alt={getDisplayName(comment.author)}
                          width={40}
                          height={40}
                          className="object-cover rounded-full"
                          quality={75}
                        />
                      ) : (
                        (comment.author?.first_name?.charAt(0) || getDisplayName(comment.author)?.charAt(0) || 'U').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
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
                        {isCommentOwner(comment.author) && (
                          <div className="relative" ref={openMenu === comment.public_id ? menuRef : null}>
                            <button
                              onClick={() => setOpenMenu(openMenu === comment.public_id ? null : comment.public_id)}
                              className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                              title="Comment options"
                            >
                              <span className="text-gray-400 hover:text-white text-lg">⋯</span>
                            </button>
                            {openMenu === comment.public_id && (
                              <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                                <button
                                  onClick={() => handleEditComment(comment)}
                                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <span>✏️</span> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment)}
                                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
                                >
                                  <span>🗑️</span> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {editingComment?.public_id === comment.public_id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editingComment.content}
                            onChange={(e) => setEditingComment({...editingComment, content: e.target.value})}
                            className="w-full bg-slate-900/60 border border-gray-700 rounded-xl text-white px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(editingComment)}
                              className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        renderContentWithMention(comment.content, comment, null)
                      )}
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
                  
                  {/* Replies Section - Always visible */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div key={`replies-section-${comment.public_id}`} className="mt-3 ml-12 space-y-3">
                      {comment.replies.map(reply => (
                        <div 
                          key={`reply-${reply.public_id}`}
                          className="relative bg-gradient-to-b from-gray-700/30 to-black/30 rounded-xl p-3 border border-purple-500/20 backdrop-blur-sm"
                        >
                          <div className="flex space-x-3">
                            <div className="relative w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                              {reply.author?.profile_image_url ? (
                                <Image
                                  src={absoluteUrl(reply.author.profile_image_url)}
                                  alt={getDisplayName(reply.author)}
                                  width={32}
                                  height={32}
                                  className="object-cover rounded-full"
                                  quality={75}
                                />
                              ) : (
                                (reply.author?.first_name?.charAt(0) || getDisplayName(reply.author)?.charAt(0) || 'U').toUpperCase()
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-white">{getDisplayName(reply.author)}</span>
                                  <span className="text-gray-500 text-sm">{formatTimeAgo(reply.created_at)}</span>
                                </div>
                                {isCommentOwner(reply.author) && (
                                  <div className="relative" ref={openMenu === reply.public_id ? menuRef : null}>
                                    <button
                                      onClick={() => setOpenMenu(openMenu === reply.public_id ? null : reply.public_id)}
                                      className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
                                      title="Reply options"
                                    >
                                      <span className="text-gray-400 hover:text-white text-lg">⋯</span>
                                    </button>
                                    {openMenu === reply.public_id && (
                                      <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                                        <button
                                          onClick={() => handleEditComment(reply)}
                                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                                        >
                                          <span>✏️</span> Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(reply)}
                                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
                                        >
                                          <span>🗑️</span> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {editingComment?.public_id === reply.public_id ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={editingComment.content}
                                    onChange={(e) => setEditingComment({...editingComment, content: e.target.value})}
                                    className="w-full bg-slate-900/60 border border-gray-700 rounded-xl text-white px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(editingComment)}
                                      className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                renderContentWithMention(reply.content, comment, reply)
                              )}
                              <div className="flex items-center space-x-4 mt-2">
                                <button 
                                  // FIX: Pass comment.public_id as the top-level parent when replying to a reply
                                  onClick={() => handleReplyClick(reply, comment.public_id)}
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Emoji quick-bar (6 emojis) */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-0 overflow-x-auto py-1">
            {EMOJI_BAR.map((em) => (
              <button
                key={em}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); insertEmojiAtCursor(em); }}
                className="text-2xl px-2 py-1 rounded-md hover:bg-gray-800/40"
                aria-label={`Insert ${em}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Add Comment Section */}
        <div className="p-2 border-t border-cyan-500/30 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md relative z-10">
          {replyingTo && (
            <div className="px-4 pb-2 flex items-center justify-between text-sm text-gray-300">
              <div className="truncate">Replying to <span className="font-semibold text-white">{getDisplayName(replyingTo.author)}</span></div>
              <button onClick={handleCancelReply} className="text-yellow-300 hover:underline ml-4">Cancel</button>
            </div>
          )}
          <div className="flex-1 flex items-end space-x-3">
            <textarea
              ref={commentTextareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-slate-900/60 border border-gray-700 rounded-xl text-white px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 resize-none min-h-[40px] max-h-[120px]"
              placeholder="Add a comment..."
              rows={1}
              onFocus={() => { /* intentionally do not open keyboard/picker */ }}
              onSelect={(e) => {
                try {
                  const ta = e.target;
                  commentCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
                } catch (err) {}
              }}
              onKeyUp={(e) => {
                try {
                  const ta = e.target;
                  commentCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
                } catch (err) {}
              }}
              onMouseUp={(e) => {
                try {
                  const ta = e.target;
                  commentCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
                } catch (err) {}
              }}
              onTouchEnd={(e) => {
                try {
                  const ta = e.target;
                  commentCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
                } catch (err) {}
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (replyingTo) handleAddReply(replyingTo); else handleAddComment();
                }
              }}
            />
            {/* emoji bar above replaces per-input emoji button */}
            <button
              onClick={() => replyingTo ? handleAddReply(replyingTo) : handleAddComment()}
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
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
      </div>
    </div>
  );
};

export default CommentModal;