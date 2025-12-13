"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { buildImageUrl } from '@/utils/cdn';
import { storiesApi, versesApi, momentsApi } from '../../../lib/api';
import { useImageCompressionUploader } from '../../../hooks/useImageCompressionUploader';

// Default tags as fallback
const DEFAULT_TAGS = ['Fantasy', 'Adventure', 'Mystery', 'Romance', 'Sci-Fi', 
                      'Horror', 'Thriller', 'Poetry', 'Life', 'Travel',
                      'Food', 'Technology', 'Art', 'Music', 'History'];

// Helper function to get CSRF token
const getCsrfToken = () => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrftoken=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
};

// Helper function to generate unique IDs
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Confirmation Dialog Component
const ConfirmationDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10200] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-purple-500/20">
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

// Add displayName to ConfirmationDialog
ConfirmationDialog.displayName = 'ConfirmationDialog';

// Delete Confirmation Modal Component
const DeleteVerseConfirmation = ({ isOpen, verseNumber, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10200] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-red-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
            <span className="fas fa-exclamation text-red-400 text-lg"></span>
          </div>
          <h3 className="text-xl font-bold text-white">Delete Verse?</h3>
        </div>
        <p className="text-gray-300 mb-6">Are you sure you want to delete Verse #{verseNumber}? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Keep It
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="fas fa-trash text-sm"></span> Delete Verse
          </button>
        </div>
      </div>
    </div>
  );
};

// Add displayName to DeleteVerseConfirmation
DeleteVerseConfirmation.displayName = 'DeleteVerseConfirmation';

// Optimized Verse Content Component with internal state
const VerseContent = memo(({ value, onChange, verseId, ...props }) => {
  const textareaRef = useRef(null);

  const handleChange = useCallback((e) => {
    onChange(e.target.value);
    // Auto-expand textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // 200px ≈ 5 lines
    textarea.style.height = newHeight + 'px';
  }, [onChange]);

  return (
    <textarea
      ref={textareaRef}
      {...props}
      id={`verse-content-${verseId}`}
      value={value}
      onChange={handleChange}
      rows={2}
      className={
        `${props.className || ''} verse-content-textarea overflow-hidden`
      }
    />
  );
});

// Add displayName to VerseContent
VerseContent.displayName = 'VerseContent';

// Memoized Verse Item Component
const VerseItem = memo(({ 
  verse, 
  index, 
  onVerseChange, 
  onImageUpload,
  onRemoveVerse,
  onDeleteMoment,
  onRemoveImage,
  onDeleteVerseClick,
  validationErrors,
  isEditingVerse,
  title
}) => {
  const contentErrorKey = `verse_${index}_content`;
  const isExisting = verse.isExisting;
  
  const handleContentChange = useCallback((newValue) => {
    onVerseChange(verse.id, 'content', newValue);
  }, [verse.id, onVerseChange]);
  
  return (
    <div className={`verse-item bg-gradient-to-b ${isExisting ? 'from-slate-900/60 to-indigo-900/60' : 'from-slate-900/80 to-black/80'} border ${isExisting ? 'border-purple-500/40' : 'border-blue-900/30'} rounded-2xl p-8 mb-8`} id={`verse-${index}`}>
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center text-purple-400 text-sm font-bold">
            {index + 1}
          </span>
          Verse #{index + 1} {isExisting && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Existing</span>}
        </h4>
        {(!isExisting || isExisting) && !isEditingVerse && (
          <button 
            onClick={() => onDeleteVerseClick(verse.id, index + 1)}
            className="w-10 h-10 rounded-full bg-red-500/30 hover:bg-red-500/40 flex items-center justify-center text-red-400 transition-all duration-300 border border-red-500/30"
            title="Remove verse"
          >
            <span className="fas fa-times"></span>
          </button>
        )}
      </div>
      
      {/* Verse Content */}
      <div className="space-y-4 mb-6">
        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="fas fa-pen text-purple-400"></span> Content
          <span className="text-xs text-gray-500 ml-2">(optional)</span>
        </label>
        <VerseContent 
          placeholder="Describe your verse (optional)"
          value={verse.content || ''}
          onChange={handleContentChange}
          verseId={verse.id}
          className={`w-full bg-slate-900/40 border rounded-2xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all resize-none ${
            validationErrors[contentErrorKey] ? 'border-red-500/50' : 'border-gray-700'
          }`}
        />
        {validationErrors[contentErrorKey] && (
          <p className="text-red-400 text-sm">{validationErrors[contentErrorKey]}</p>
        )}
      </div>
      
      {/* Verse Moments (Images) */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="fas fa-images text-purple-400"></span> Verse Moments (Images)
        </label>
        
                {verse.imageIds && verse.imageIds.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {verse.imageIds.map((image, imgIndex) => (
              <div key={imgIndex} className="relative group">
                {typeof image === 'string' ? (
                  <div className="relative w-full h-36">
                    <Image
                      src={buildImageUrl(image, { w: 1080, fmt: 'webp' })}
                      alt={title ? `${title} - Moment ${imgIndex + 1}` : `Moment ${imgIndex + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover rounded-xl border border-gray-700"
                      onError={(e) => {
                        // next/image doesn't expose the underlying img element directly here
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-36">
                    <Image
                      src={image.preview || image.url || image.file_url || (image.file ? URL.createObjectURL(image.file) : '')}
                      alt={title ? `${title} - Moment ${imgIndex + 1}` : `Moment ${imgIndex + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover rounded-xl border border-gray-700"
                    />
                  </div>
                )}
                <button 
                  onClick={() => {
                    const imageToDelete = verse.imageIds[imgIndex];
                    // Track this moment for deletion if it has a public_id (existing moment)
                    if (imageToDelete && imageToDelete.public_id) {
                      onDeleteMoment(imageToDelete.public_id);
                    }
                    
                    onRemoveImage(verse.id, imgIndex);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center text-white text-xs transition-opacity"
                  title="Delete this image"
                >
                  <span className="fas fa-trash"></span>
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {imgIndex + 1}
                </div>
              </div>
            ))}
            
            <div className="relative h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group">
              <input 
                type="file" 
                className="hidden" 
                multiple 
                accept="image/*" 
                id={`verse-image-input-${verse.id}`}
                onChange={(e) => onImageUpload(verse.id, e)}
              />
              <label 
                htmlFor={`verse-image-input-${verse.id}`}
                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                  <span className="fas fa-plus text-purple-400 text-xl"></span>
                </div>
                <p className="text-gray-300 text-sm">Add images</p>
              </label>
            </div>
          </div>
        ) : (
          <div className="relative h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group">
            <input 
              type="file" 
              className="hidden" 
              multiple 
              accept="image/*" 
              id={`verse-image-input-${index}`}
              onChange={(e) => onImageUpload(verse.id, e)}
            />
            <label 
              htmlFor={`verse-image-input-${index}`}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                <span className="fas fa-images text-purple-400 text-xl"></span>
              </div>
              <p className="text-gray-300 text-sm">Add images</p>
            </label>
          </div>
        )}
        
        {/* Error message will show up here if neither content nor images are provided */}
        {validationErrors[`verse_${index}_empty`] && (
          <p className="text-red-400 text-sm mt-2">
            Please add either text content or at least one image
          </p>
        )}
      </div>
    </div>
  );
});

// Add displayName to VerseItem
VerseItem.displayName = 'VerseItem';

// Memoized Tag Input Component
const TagInput = memo(({ 
  tagInput, 
  selectedTags, 
  availableTags,
  tagsLoading,
  tagsError,
  onTagInputChange,
  onAddTag,
  onAddTagByValue,
  onRemoveTag
}) => {
  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
        <span className="fas fa-tags text-cyan-400"></span> Tags
      </label>
      <div className="flex flex-wrap gap-3 mb-4">
        {selectedTags.map((tag, index) => (
          <div key={index} className="flex items-center bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-xl px-4 py-2 border border-cyan-500/30">
            <span className="text-cyan-400 text-sm">{tag}</span>
            <button 
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="ml-2 text-cyan-400 hover:text-red-400 transition-colors"
            >
              <span className="fas fa-times text-xs"></span>
            </button>
          </div>
        ))}
      </div>
      <div className="relative">
        <input 
          type="text" 
          placeholder="Add tags (press Enter or comma to add)"
          value={tagInput}
          onChange={onTagInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              onAddTag();
            }
          }}
          className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 text-lg"
        />
        <button 
          type="button"
          onClick={onAddTag}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg px-3 py-1 text-sm font-medium"
        >
          Add
        </button>
      </div>
      <div className="mt-4">
        <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
          <span>Popular tags:</span>
          {tagsLoading && (
            <span className="fas fa-spinner fa-spin text-xs"></span>
          )}
        </p>
        
        {tagsError ? (
          <div className="text-red-400 text-sm mb-2">{tagsError}</div>
        ) : null}
        
        <div className="flex flex-wrap gap-2">
          {availableTags.slice(0, 8).map((tag, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onAddTagByValue(tag)}
              className={`${
                selectedTags.includes(tag)
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white'
              } rounded-lg px-3 py-1 text-sm transition-colors flex items-center gap-1`}
            >
              {tag}
              {/* Show popularity indicator for the top 3 tags */}
              {index < 3 && (
                <span className="text-xs bg-yellow-500/20 text-yellow-300 rounded-full w-4 h-4 flex items-center justify-center">
                  {index + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// Add displayName to TagInput
TagInput.displayName = 'TagInput';

const StoryFormModal = ({ 
  isOpen = false, 
  onClose = () => {}, 
  onSubmit = () => {},
  editingStory = null,
  editingVerse = null,
  onUpdateStory = null,
  onUpdateVerse = null,
  user = null,
  mode = 'create'
}) => {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuth();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent background scrolling when modal is open and restore on close
  useEffect(() => {
    const originalOverflow = typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (typeof document !== 'undefined') document.body.style.overflow = originalOverflow || '';
    };
  }, [isOpen]);
  
  const [imagePreview, setImagePreview] = useState(editingStory?.cover_image?.file_url || null);
  const [imageFile, setImageFile] = useState(null);
  const [title, setTitle] = useState(editingStory?.title || editingVerse?.title || '');
  const [description, setDescription] = useState(editingStory?.description || editingVerse?.description || '');
  const [verses, setVerses] = useState(editingVerse ? 
    [{ 
      id: editingVerse.slug || generateUniqueId(), 
      content: editingVerse.content || '',
      isExisting: true,
      imageIds: editingVerse.moments?.filter(m => m.image).map(m => ({ 
        public_id: m.image.public_id,
        file_url: m.image.file_url
      })) || [], 
      slug: editingVerse.slug
    }] : 
    editingStory?.verses?.map(verse => ({
      id: verse.slug || generateUniqueId(),
      content: verse.content || '',
      isExisting: true,
      imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
        public_id: m.image.public_id,
        file_url: m.image.file_url
      })) || [],
      slug: verse.slug
    })) || [{ id: generateUniqueId(), content: '', isExisting: false, imageIds: [] }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState(
    (editingStory?.tags || []).map(tag => (typeof tag === 'string' ? tag : (tag && (tag.name || tag.slug) ? (tag.name || tag.slug) : String(tag))))
  );
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState(null);
  const [coverImageId, setCoverImageId] = useState(editingStory?.cover_image?.public_id || null);
  const [allowContributions, setAllowContributions] = useState(editingStory?.allow_contributions || false);
  const [showEmptyVerseConfirmation, setShowEmptyVerseConfirmation] = useState(false);
  const [deletedVerses, setDeletedVerses] = useState([]);
  const [deletedMoments, setDeletedMoments] = useState([]);
  const [showDeleteVerseConfirmation, setShowDeleteVerseConfirmation] = useState(false);
  const [verseToDelete, setVerseToDelete] = useState(null);
  
  const verseRefs = useRef([]);
  
  // Fetch popular tags from API
  const fetchPopularTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError(null);
    
    try {
      // Try to fetch popular tags from API via route handler (don't expose backend URL)
      const response = await fetch(`/api/tags/popular/`);
      if (response.ok) {
        const data = await response.json();
        // Sort by usage count (most popular first)
        const sortedTags = data.sort((a, b) => b.usage_count - a.usage_count).map(tag => tag.name);
        setAvailableTags(sortedTags);
      } else {
        throw new Error('Failed to fetch popular tags');
      }
    } catch (err) {
      setTagsError('Failed to load popular tags');
      
      // Fallback to default tags if API fails
      setAvailableTags(DEFAULT_TAGS);
    } finally {
      setTagsLoading(false);
    }
  }, []);
  
  // Fetch tags when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPopularTags();
    }
  }, [isOpen, fetchPopularTags]);
  
  // Initialize form when editing a story
  useEffect(() => {
    if (editingStory) {
      setTitle(editingStory.title || '');
      setDescription(editingStory.description || '');
      setImagePreview(editingStory.cover_image?.file_url || null);
      setCoverImageId(editingStory.cover_image?.public_id || null);
      setSelectedTags((editingStory.tags || []).map(tag => (typeof tag === 'string' ? tag : (tag && (tag.name || tag.slug) ? (tag.name || tag.slug) : String(tag)))));
      setAllowContributions(editingStory.allow_contributions || false);
      
      // Fetch full story data if verses are missing or empty
      const hasVerses = editingStory.verses && editingStory.verses.length > 0;
      const hasVerseImages = hasVerses && editingStory.verses.some(v => v.moments && v.moments.length > 0);
      
      if (!hasVerses || !hasVerseImages) {
        // Fetch the full story with verses and moments
        (async () => {
          try {
            const fullStory = await storiesApi.getStoryBySlug(editingStory.slug);
            if (fullStory && fullStory.verses && fullStory.verses.length > 0) {
              setVerses(fullStory.verses.map(verse => ({
                id: verse.slug || generateUniqueId(),
                content: verse.content || '',
                isExisting: true,
                imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
                  public_id: m.image.public_id,
                  file_url: m.image.file_url
                })) || [],
                slug: verse.slug
              })));
              return;
            }
          } catch (err) {
            console.error('Failed to fetch full story data:', err);
          }
          
          // Fallback: use provided data
          if (editingStory.verses && editingStory.verses.length > 0) {
            setVerses(editingStory.verses.map(verse => ({
              id: verse.slug || generateUniqueId(),
              content: verse.content || '',
              isExisting: true,
              imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
                public_id: m.image.public_id,
                file_url: m.image.file_url
              })) || [],
              slug: verse.slug
            })));
          } else {
            setVerses([{ id: generateUniqueId(), content: '', isExisting: false, imageIds: [] }]);
          }
        })();
      } else {
        // Use provided data if verses and images are already loaded
        setVerses(editingStory.verses.map(verse => ({
          id: verse.slug || generateUniqueId(),
          content: verse.content || '',
          isExisting: true,
          imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
            public_id: m.image.public_id,
            file_url: m.image.file_url
          })) || [],
          slug: verse.slug
        })));
      }
    }
  }, [editingStory]);
  
  // Check if all verses are empty (no content and no images)
  const areAllVersesEmpty = useCallback(() => {
    return verses.every(verse => {
      const hasContent = verse.content && verse.content.trim() !== '';
      const hasImages = verse.imageIds && verse.imageIds.length > 0;
      return !hasContent && !hasImages;
    });
  }, [verses]);
  
  // Validation function - now only validates title, not verses
  const validateForm = () => {
    const errors = {};
    let firstErrorField = null;
    
    if (!title.trim() && !editingVerse) {
      errors.title = 'Story title is required';
      firstErrorField = 'story-title';
    }
    
    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, firstErrorField };
  };
  
  // Scroll to the first error field
  const scrollToFirstError = useCallback((firstErrorField) => {
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Highlight the field briefly
        element.classList.add('ring-2', 'ring-red-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500');
        }, 2000);
        
        // Focus on the field if it's an input
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.focus();
        }
      }
    }
  }, []);

  // Helper function to generate preview from file
  const generatePreview = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to generate preview'));
      reader.readAsDataURL(file);
    });
  }, []);
  
  // Handle image upload for post with compression
  const { compressImageFile } = useImageCompressionUploader();
  
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Image file must be less than 50MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      try {
        setError(null);
        console.log(`[StoryFormModal] Starting compression for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        // Compress the cover image with high quality settings (no aggressive noise reduction)
        const compressed = await compressImageFile(file, {
          maxWidth: 1200,  // Higher resolution for better quality
          quality: 0.90,   // High quality (90%)
          noiseReduction: false  // Disable noise reduction to preserve detail
        });
        console.log(`[StoryFormModal] Compressed result: ${compressed.compressedSize}KB`);
        
        setImageFile(compressed.file);
        setImagePreview(compressed.preview);
        console.log(`Image compressed: ${compressed.originalSize}KB → ${compressed.compressedSize}KB (${compressed.ratio}% reduction)`);
      } catch (err) {
        console.error(`[StoryFormModal] Compression error:`, err);
        setError(`Failed to process image: ${err.message}`);
      }
    }
  }, [compressImageFile]);
  
  // Handle verse image upload with compression
  const handleVerseImageUpload = useCallback(async (verseId, e) => {
    if (typeof e === 'number') {
      setVerses(prevVerses => 
        prevVerses.map(verse => {
          if (verse.id === verseId) {
            const newImageIds = [...verse.imageIds];
            newImageIds.splice(e, 1);
            return { ...verse, imageIds: newImageIds };
          }
          return verse;
        })
      );
      return;
    }
    
    if (Array.isArray(e)) {
      setVerses(prevVerses => 
        prevVerses.map(verse => 
          verse.id === verseId 
            ? { 
                ...verse, 
                imageIds: [...verse.imageIds, ...e]
              } 
            : verse
        )
      );
      return;
    }
    
    if (e.target && e.target.files) {
      const files = Array.from(e.target.files);
      const inputElement = e.target;
      
      if (files.length > 0) {
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
          if (file.size > 50 * 1024 * 1024) {
            invalidFiles.push(`${file.name} is too large (>50MB)`);
          } else if (!file.type.startsWith('image/')) {
            invalidFiles.push(`${file.name} is not a valid image`);
          } else {
            validFiles.push({
              file: file,
              name: file.name
            });
          }
        });
        
        if (invalidFiles.length > 0) {
          setError(`Invalid files: ${invalidFiles.join(', ')}`);
          // Reset the input value so user can select again
          inputElement.value = '';
          return;
        }

        // Compress all images in parallel
        (async () => {
          try {
            const compressedFiles = await Promise.all(
              validFiles.map(async (f) => {
                try {
                  const compressed = await compressImageFile(f.file);
                  console.log(`Verse image compressed: ${compressed.originalSize}KB → ${compressed.compressedSize}KB (${compressed.ratio}% reduction)`);
                  return {
                    file: compressed.file,
                    preview: compressed.preview,
                    name: f.name,
                    tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  };
                } catch (error) {
                  console.error(`Failed to compress ${f.name}:`, error);
                  // Return original file if compression fails
                  const preview = await generatePreview(f.file);
                  return {
                    file: f.file,
                    preview,
                    name: f.name,
                    tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  };
                }
              })
            );

            setVerses(prevVerses => 
              prevVerses.map(verse => 
                verse.id === verseId 
                  ? { 
                      ...verse, 
                      imageIds: [...verse.imageIds, ...compressedFiles]
                    } 
                  : verse
              )
            );
            setError(null);
            
            // Reset input value after successful upload
            inputElement.value = '';
          } catch (err) {
            setError(`Failed to process images: ${err.message}`);
            // Reset the input value on error too
            inputElement.value = '';
          }
        })();
      }
    }
  }, [compressImageFile, generatePreview]);
  
  // Handle verse field changes
  const handleVerseChange = useCallback((verseId, field, value) => {
    setVerses(prevVerses => 
      prevVerses.map(verse => 
        verse.id === verseId ? { ...verse, [field]: value } : verse
      )
    );
    
    const verseIndex = verses.findIndex(v => v.id === verseId);
    const errorKey = `verse_${verseIndex}_${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => ({...prev, [errorKey]: null}));
    }
  }, [verses, validationErrors]);
  
  // Handle tag input
  const handleTagInputChange = useCallback((e) => {
    setTagInput(e.target.value);
  }, []);
  
  // Add tag
  const addTag = useCallback(() => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags([...selectedTags, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, selectedTags]);
  
  // Add tag directly by value (for popular tags)
  const addTagByValue = useCallback((tagValue) => {
    if (tagValue.trim() && !selectedTags.includes(tagValue.trim())) {
      setSelectedTags([...selectedTags, tagValue.trim()]);
    }
  }, [selectedTags]);
  
  // Remove tag
  const removeTag = useCallback((tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  }, [selectedTags]);
  
  // Add new verse
  const addNewVerse = useCallback(() => {
    setVerses(prevVerses => [...prevVerses, { id: generateUniqueId(), content: '', isExisting: false, imageIds: [] }]);
  }, []);
  
  // Remove verse
  const removeVerse = useCallback((verseId) => {
    const verseToRemove = verses.find(v => v.id === verseId);
    
    if (verseToRemove && verseToRemove.isExisting && verseToRemove.slug) {
      // Track this existing verse for deletion
      setDeletedVerses(prev => [...prev, verseToRemove.slug]);
      
      // Also track all moments (images) from this verse for deletion
      const moments = verseToRemove.imageIds || [];
      const momentsToDelete = moments.filter(m => m.public_id).map(m => m.public_id);
      if (momentsToDelete.length > 0) {
        setDeletedMoments(prev => [...prev, ...momentsToDelete]);
      }
    }
    
    if (verses.length > 1) {
      setVerses(verses.filter(verse => verse.id !== verseId));
    }
  }, [verses]);

  // Handle verse delete button click - show confirmation
  const handleDeleteVerseClick = useCallback((verseId, verseNumber) => {
    setVerseToDelete({ id: verseId, number: verseNumber });
    setShowDeleteVerseConfirmation(true);
  }, []);

  // Confirm verse deletion
  const handleConfirmVerseDelete = useCallback(() => {
    if (verseToDelete) {
      removeVerse(verseToDelete.id);
      setShowDeleteVerseConfirmation(false);
      setVerseToDelete(null);
    }
  }, [verseToDelete, removeVerse]);

  // Cancel verse deletion
  const handleCancelVerseDelete = useCallback(() => {
    setShowDeleteVerseConfirmation(false);
    setVerseToDelete(null);
  }, []);
  
  // Scroll to verses section
  const scrollToVerses = useCallback(() => {
    const versesSection = document.getElementById('versesContainer');
    if (versesSection) {
      versesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Focus on the first verse's content input
      setTimeout(() => {
        const firstVerse = document.getElementById('verse-0');
        if (firstVerse) {
          const contentInput = firstVerse.querySelector('textarea');
          if (contentInput) {
            contentInput.focus();
          }
        }
      }, 300);
    }
  }, []);
  
  // Handle publish/update post and verses
  const handlePublish = async () => {
    const { isValid, firstErrorField } = validateForm();
    
    if (!isValid) {
      setError('Please fix the validation errors below');
      scrollToFirstError(firstErrorField);
      return;
    }

    // Check if all verses are empty and show confirmation if needed
    if (areAllVersesEmpty()) {
      setShowEmptyVerseConfirmation(true);
      return;
    }

    await proceedWithPublish();
  };

  // Optimized upload function with progress tracking
  const uploadImageWithProgress = async (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error || errorMessage;
          } catch (e) {
            // Ignore parsing errors
          }
          reject(new Error(errorMessage));
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name || '');
      
      // Get auth token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Open request
      xhr.open('POST', '/api/images/', true);
      
      // Set headers
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      // Include credentials
      xhr.withCredentials = true;
      
      // Send request
      xhr.send(formData);
    });
  };

  const proceedWithPublish = async () => {
    setShowEmptyVerseConfirmation(false);
    setLoading(true);
    setError(null);

    try {
      // Check authentication
      if (!isAuthenticated || !currentUser) {
        throw new Error('You must be logged in to perform this action');
      }

      // Prepare all images for upload (cover and verse images)
      const allImagesToUpload = [];
      
      // Add cover image if exists
      if (imageFile) {
        allImagesToUpload.push({
          file: imageFile,
          type: 'cover',
          onProgress: (percent) => {
            // Update UI with progress if needed
            console.log(`Cover image upload: ${percent.toFixed(0)}%`);
          }
        });
      }
      
      // Add verse images
      verses.forEach((verse, verseIndex) => {
        (verse.imageIds || []).forEach((img, imgIndex) => {
          if (img && (img.file instanceof File || img instanceof File)) {
            const file = img.file instanceof File ? img.file : img;
            allImagesToUpload.push({
              file: file,
              type: 'verse',
              verseIndex,
              imgIndex,
              onProgress: (percent) => {
                // Update UI with progress if needed
                console.log(`Verse ${verseIndex + 1}, Image ${imgIndex + 1} upload: ${percent.toFixed(0)}%`);
              }
            });
          }
        });
      });

      // Upload all images in parallel with progress tracking
      const uploadPromises = allImagesToUpload.map(img => 
        uploadImageWithProgress(img.file, img.onProgress)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Process upload results and map to original images
      let resultIndex = 0;
      let finalCoverImageId = coverImageId;
      
      // Process cover image result
      if (imageFile) {
        finalCoverImageId = uploadResults[resultIndex].public_id;
        resultIndex++;
      }
      
      // Process verse images and update verses with uploaded image IDs
      const updatedVerses = verses.map(verse => {
        const uploadedImageIds = [];
        
        // Copy existing image IDs (strings or objects with public_id)
        (verse.imageIds || []).forEach(img => {
          if (typeof img === 'string') {
            uploadedImageIds.push(img);
          } else if (img && img.public_id) {
            uploadedImageIds.push(img.public_id);
          } else if (img && (img.file instanceof File || img instanceof File)) {
            // This is a newly uploaded file
            if (resultIndex < uploadResults.length) {
              uploadedImageIds.push(uploadResults[resultIndex].public_id);
              resultIndex++;
            }
          }
        });
        
        return {
          ...verse,
          uploadedImageIds
        };
      });

      // Prepare story payload
      const storyPayload = {
        title: title.trim(),
        description: description.trim(),
        tags_input: selectedTags,
        allow_contributions: allowContributions,
        creator: currentUser.id || currentUser.pk || currentUser.username
      };

      // Add cover image to payload if we have one
      if (finalCoverImageId) {
        storyPayload.cover_image_public_id = finalCoverImageId;
      }

      // Create or update story
      let savedStory;
      if (editingStory) {
        savedStory = await storiesApi.updateStory(editingStory.slug, storyPayload);
      } else {
        savedStory = await storiesApi.createStory(storyPayload);
      }

      // Handle deletions of verses and moments
      if (deletedMoments.length > 0) {
        const momentDeletePromises = deletedMoments.map(momentId => 
          momentsApi.deleteMoment(momentId).catch(err => {
            console.error(`Failed to delete moment ${momentId}:`, err);
            // Don't throw - continue with other deletions
          })
        );
        await Promise.all(momentDeletePromises);
      }

      if (deletedVerses.length > 0) {
        const verseDeletePromises = deletedVerses.map(verseSlug => 
          versesApi.deleteVerse(verseSlug).catch(err => {
            console.error(`Failed to delete verse ${verseSlug}:`, err);
            // Don't throw - continue with other deletions
          })
        );
        await Promise.all(verseDeletePromises);
      }

      // Prepare verses for creation/update
      const storyIdentifier = savedStory?.public_id || savedStory?.id || savedStory?.slug;
      
      // Create/update verses in parallel
      // Skip verses that are completely empty (no content and no images)
      const versesToProcess = updatedVerses.filter(verse => {
        const hasContent = (verse.content || '').trim() !== '';
        const hasImages = (verse.uploadedImageIds || []).length > 0;
        return hasContent || hasImages;
      });

      const versePromises = versesToProcess.map(async (verse, index) => {
        const verseData = {
          story: storyIdentifier,
          content: (verse.content || '').trim(),
          order: verse.order || index + 1,
          image_ids: verse.uploadedImageIds || []
        };

        let verseResponse;
        
        // Check if this is an existing verse or a new one
        if (verse.slug && editingStory) {
          // This is an existing verse, update it
          verseResponse = await versesApi.updateVerse(verse.slug, verseData);
        } else {
          // This is a new verse, create it
          verseResponse = await versesApi.createVerse(verseData);
        }

        // Create moments for each image in parallel
        const imageIds = verse.uploadedImageIds || [];
        if (imageIds.length > 0) {
          const momentPromises = imageIds.map((imageId, m) => 
            momentsApi.createMoment({
              verse: verseResponse.public_id || verseResponse.id,
              image_id: imageId,
              order: m + 1
            })
          );
          
          await Promise.all(momentPromises);
        }

        return verseResponse;
      });

      // Wait for all verses to be created/updated
      const createdVerses = await Promise.all(versePromises);

      // Attach created verses to savedStory for immediate UI update
      if (createdVerses.length > 0) {
        try {
          savedStory.verses = createdVerses;
        } catch (e) {
          // ignore
        }
      }

      setSuccess(editingStory ? 'Story updated successfully!' : 'Story created successfully!');
      if (onUpdateStory) {
        onUpdateStory(savedStory, !editingStory);
      }

      // Reset deletion tracking after successful publish
      setDeletedVerses([]);
      setDeletedMoments([]);

      // Notify server-side proxy to trigger revalidation and indexing
      try {
        const csrf = getCsrfToken();
        fetch('/api/publish-proxy', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf
          },
          body: JSON.stringify({ slug: savedStory?.slug })
        })
      } catch (e) {
        console.error('Failed to notify publish proxy:', e);
      }

      setTimeout(() => {
        onClose();
        setSuccess(null);
        // Redirect to story slug after update
        if (savedStory.slug) {
          router.push(`/stories/${savedStory.slug}`);
        } else if (editingStory && editingStory.slug) {
          // Fallback to editingStory.slug if savedStory doesn't have slug
          router.push(`/stories/${editingStory.slug}`);
        }
      }, 1500); // Reduced timeout for faster feedback
    } catch (err) {
      console.error('Publish error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'An error occurred while saving the story. Please try again.';
      
      if (err.message.includes('permission denied') || err.message.includes('403')) {
        errorMessage = 'Upload permission denied. Please try refreshing the page and logging in again.';
      } else if (err.message.includes('Session expired') || err.message.includes('401')) {
        errorMessage = 'Your session has expired. Please refresh the page and try again.';
      } else if (err.message.includes('Network error')) {
        errorMessage = 'Network error during upload. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel publishing and go back to verses
  const cancelPublish = () => {
    setShowEmptyVerseConfirmation(false);
    scrollToVerses();
  };
  
  // Clear form
  const clearForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setImagePreview(null);
    setImageFile(null);
    setSelectedTags([]);
    setVerses([{ id: generateUniqueId(), content: '', isExisting: false, imageIds: [] }]);
    setTagInput('');
    setAllowContributions(false);
    setError(null);
    setValidationErrors({});
    setDeletedVerses([]);
    setDeletedMoments([]);
  }, []);
  
  // Set up refs for each verse
  verseRefs.current = verses.map((_, i) => verseRefs.current[i] ?? React.createRef());
  
  // Function to scroll to a verse and focus its title input
  const scrollToVerse = useCallback((index) => {
    if (verseRefs.current[index] && verseRefs.current[index].current) {
      verseRefs.current[index].current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Focus on the content input
      const contentInput = verseRefs.current[index].current.querySelector('textarea');
      if (contentInput) {
        setTimeout(() => {
          contentInput.focus();
        }, 300);
      }
    }
  }, []);
  
  // Function to handle adding a new verse and scrolling to it
  const handleAddVerse = useCallback(() => {
    addNewVerse();
    // Scroll to the new verse after a short delay to allow DOM to update
    setTimeout(() => {
      scrollToVerse(verses.length);
    }, 100);
  }, [addNewVerse, scrollToVerse, verses.length]);
  
  // Handle image preview for verse images
  const handleImagePreview = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }, []);
  
  // Handle verse image file selection with compression
  const handleVerseImageFileChange = useCallback(async (verseId, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const validFiles = [];
      const invalidFiles = [];
      
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          invalidFiles.push(`${file.name} is too large (>50MB)`);
        } else if (!file.type.startsWith('image/')) {
          invalidFiles.push(`${file.name} is not a valid image`);
        } else {
          validFiles.push(file);
        }
      }
      
      if (invalidFiles.length > 0) {
        setError(`Invalid files: ${invalidFiles.join(', ')}`);
        return;
      }

      // Compress all files and generate previews
      try {
        const imagePreviews = await Promise.all(
          validFiles.map(async (file) => {
            try {
              const compressed = await compressImageFile(file);
              console.log(`Verse preview image compressed: ${compressed.originalSize}KB → ${compressed.compressedSize}KB (${compressed.ratio}% reduction)`);
              return {
                file: compressed.file,
                preview: compressed.preview,
                name: file.name
              };
            } catch (error) {
              console.error(`Compression failed for ${file.name}, using original:`, error);
              // Fallback to original file with preview
              const preview = await generatePreview(file);
              return {
                file: file,
                preview: preview,
                name: file.name
              };
            }
          })
        );

        // Pass compressed files and previews to the handler
        handleVerseImageUpload(verseId, imagePreviews);
      } catch (error) {
        setError(`Failed to process images: ${error.message}`);
      }
    }
  }, [compressImageFile, generatePreview, handleVerseImageUpload]);
  
  // Modal Header Component
  const ModalHeader = () => {
    const getModalTitle = () => {
      if (editingStory) return 'EDIT STORY';
      if (editingVerse) return 'EDIT VERSE';
      return 'CREATE NEW STORY';
    };
    
    const getModalSubtitle = () => {
      if (editingStory) return 'Update your creative journey';
      if (editingVerse) return 'Update your verse';
      return 'Share your creative journey with the world';
    };
    
    return (
      <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-6 py-4">
        {success && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-2 text-green-300 flex items-center gap-2 z-50 animate-fade-in-down">
            <span className="fas fa-check-circle"></span>
            {success}
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
              <span className="fas fa-book text-cyan-400 text-lg"></span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                {getModalTitle()}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              title="Clear form"
              className="w-9 h-9 rounded-lg bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
              onClick={clearForm}
            >
              <span className="fas fa-sync-alt text-sm"></span>
            </button>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
            >
              <span className="fas fa-times text-sm"></span>
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Image Upload Area Component
  const ImageUploadArea = () => {
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      const inputElement = e.target;
      
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select a valid image file');
          // Reset input so user can try again
          inputElement.value = '';
          return;
        }
        
        // Validate file size (50MB pre-compression)
        if (file.size > 50 * 1024 * 1024) {
          setError('Image file must be less than 50MB');
          // Reset input so user can try again
          inputElement.value = '';
          return;
        }
        
        try {
          setError(null);
          // Compress the image
          const compressed = await compressImageFile(file);
          setImageFile(compressed.file);
          setImagePreview(compressed.preview);
          console.log(`Cover image compressed: ${compressed.originalSize}KB → ${compressed.compressedSize}KB (${compressed.ratio}% reduction)`);
          
          // Reset input after successful upload
          inputElement.value = '';
        } catch (err) {
          setError(`Failed to process image: ${err.message}`);
          // Reset input on error too
          inputElement.value = '';
        }
      }
    };

    const triggerFileInput = () => {
      fileInputRef.current.click();
    };

    const removeImage = () => {
      setImagePreview(null);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    return (
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <span className="fas fa-image text-cyan-400"></span> Cover Image
        </label>
        <div className="relative w-full h-72 rounded-2xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-cyan-500/60 transition-all duration-300 cursor-pointer group" onClick={triggerFileInput}>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
          {imagePreview ? (
            <>
              <div className="relative w-full h-full">
                <img 
                  src={imagePreview} 
                  alt={title ? `${title} - Cover image` : 'Cover image'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '';
                    e.target.alt = "Image preview failed to load";
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6 gap-4">
                <button 
                  type="button"
                  className="px-5 py-2.5 bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-400 rounded-xl font-medium transition-all duration-300 border border-cyan-500/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                >
                  <span className="fas fa-sync-alt mr-2"></span> Change
                </button>
                <button 
                  type="button"
                  className="px-5 py-2.5 bg-red-500/30 hover:bg-red-500/40 text-red-400 rounded-xl font-medium transition-all duration-300 border border-red-500/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                >
                  <span className="fas fa-trash mr-2"></span> Remove
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border border-cyan-500/30">
                <span className="fas fa-cloud-upload-alt text-cyan-400 text-3xl"></span>
              </div>
              <p className="text-gray-300 font-medium text-lg">Click to upload cover image</p>
              <p className="text-gray-500 text-sm mt-2">JPG, PNG, GIF up to 10MB</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Verse List Component
  const VerseList = () => {
    return (
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent flex-1"></div>
          <h3 className="text-2xl font-semibold text-purple-400 px-4 flex items-center gap-2">
            <span className="fas fa-scroll"></span> Story Verses
          </h3>
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent flex-1"></div>
        </div>
        
        <div className="verses-container" id="versesContainer">
          {verses.map((verse, index) => (
            <VerseItem 
              key={`verse-${verse.id || `temp-${index}`}`}
              verse={verse}
              index={index}
              onVerseChange={handleVerseChange}
              onImageUpload={handleVerseImageUpload}
              onRemoveVerse={removeVerse}
              onDeleteMoment={(momentId) => setDeletedMoments(prev => [...prev, momentId])}
              onRemoveImage={(verseId, imgIndex) => {
                setVerses(prevVerses => 
                  prevVerses.map(v => {
                    if (v.id === verseId) {
                      const newImageIds = [...v.imageIds];
                      newImageIds.splice(imgIndex, 1);
                      return { ...v, imageIds: newImageIds };
                    }
                    return v;
                  })
                );
              }}
              onDeleteVerseClick={handleDeleteVerseClick}
              validationErrors={validationErrors}
              isEditingVerse={!!editingVerse}
              title={title}
            />
          ))}
        </div>
        
        {validationErrors.verse_empty && (
          <p className="text-red-400 text-sm mt-2 ml-4">{validationErrors.verse_empty}</p>
        )}
        
        {!editingVerse && (
          <div className="flex justify-center mt-8">
            <button 
              onClick={handleAddVerse}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 border border-purple-500/30"
            >
              <span className="fas fa-plus text-xl"></span> Add Verse
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // Submit Buttons Component
  const SubmitButtons = () => {
    const isEditing = editingStory || editingVerse;
    
    return (
      <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-4">
        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="fas fa-spinner animate-spin"></span>
                {isEditing ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              <>
                <span className="fas fa-rocket text-xl"></span>
                {isEditing ? 'Update' : 'Publish Story'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  const modal = (
    <>
      {/* Outer container - handles backdrop and positioning */}
      <div className={`fixed inset-0 bg-black/90 backdrop-blur-xl z-[10100] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
        {/* Inner container - handles transform animation */}
        <div className={`flex flex-col h-full transform transition-transform duration-500 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          {/* Animated neon border effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
            <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
          </div>
          
          <ModalHeader />
          
          {/* Content area - now properly scrollable */}
          <div className="flex-1 overflow-y-auto touch-auto overscroll-contain modal-scroll">
            <div className="p-8">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
                  {error}
                </div>
              )}
              
              {/* Story Details Section */}
              <div className="mb-10" id="storyDetailsSection">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent flex-1"></div>
                  <h3 className="text-2xl font-semibold text-cyan-400 px-4 flex items-center gap-2">
                    <span className="fas fa-feather-alt"></span> Story Details
                  </h3>
                  <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent flex-1"></div>
                </div>
                
                <ImageUploadArea />
                
                {/* Title */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <span className="fas fa-heading text-cyan-400"></span> Title <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <textarea 
                      id="story-title"
                      placeholder="Give your story a captivating title"
                      value={title}
                      onChange={(e) => {
                        // Enforce 50 character limit
                        if (e.target.value.length <= 50) {
                          setTitle(e.target.value);
                          if (validationErrors.title) {
                            setValidationErrors(prev => ({...prev, title: null}));
                          }
                        }
                        // Auto-expand textarea
                        const textarea = e.target;
                        textarea.style.height = 'auto';
                        const newHeight = Math.min(textarea.scrollHeight, 42); // ~1.5 lines, expands to 2 when needed
                        textarea.style.height = newHeight + 'px';
                      }}
                      rows={1}
                      className={`w-full px-5 py-2 bg-slate-900/60 border rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 text-lg resize-none overflow-hidden ${
                        validationErrors.title ? 'border-red-500/50' : 'border-gray-700'
                      }`}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                  </div>
                  {title.length >= 50 && (
                    <p className="text-yellow-400 text-sm mt-2">⚠️ Character limit reached (50 characters max)</p>
                  )}
                  {validationErrors.title && (
                    <p className="text-red-400 text-sm mt-2">{validationErrors.title}</p>
                  )}
                </div>
                
                {/* Description */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <span className="fas fa-align-left text-cyan-400"></span> Description
                  </label>
                  <div className="relative">
                    <textarea 
                      placeholder="Share your story, thoughts, or experiences..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        // Auto-expand textarea
                        const textarea = e.target;
                        textarea.style.height = 'auto';
                        const newHeight = Math.min(textarea.scrollHeight, 200); // 200px ≈ 5 lines
                        textarea.style.height = newHeight + 'px';
                      }}
                      rows={2}
                      className="w-full px-5 py-2 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 resize-none text-lg overflow-hidden"
                    ></textarea>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                  </div>
                </div>
                
                <TagInput 
                  tagInput={tagInput}
                  selectedTags={selectedTags}
                  availableTags={availableTags}
                  tagsLoading={tagsLoading}
                  tagsError={tagsError}
                  onTagInputChange={handleTagInputChange}
                  onAddTag={addTag}
                  onAddTagByValue={addTagByValue}
                  onRemoveTag={removeTag}
                />
                
                {/* Allow contributions toggle - PROMINENT FEATURE */}
                {!editingVerse && (
                  <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-blue-950/40 via-transparent to-cyan-950/40 border-2 border-gradient-to-r from-cyan-500/60 to-blue-500/60 shadow-2xl shadow-cyan-500/20 relative overflow-hidden">
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-cyan-600/10 animate-pulse pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <label className="block text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-4 flex items-center gap-3">
                        <span className="fas fa-users text-2xl text-cyan-400 animate-bounce"></span>
                        <span className="text-lg">✨ COLLABORATIVE FEATURE ✨</span>
                      </label>
                      
                      <p className="text-gray-300 text-sm mb-5 flex items-center gap-2">
                        <span className="text-cyan-400">→</span> Let other users add verses and contribute their creativity to your story. Build amazing collaborative works together!
                      </p>
                      
                      <label className="inline-flex items-center cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={allowContributions}
                            onChange={(e) => setAllowContributions(e.target.checked)}
                          />
                          <div className={`block w-16 h-9 rounded-full transition-all duration-300 ease-in-out ${allowContributions ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 shadow-lg shadow-cyan-500/50' : 'bg-gray-700/50'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-7 h-7 rounded-full transition-all duration-300 ease-in-out shadow-lg ${allowContributions ? 'transform translate-x-7 shadow-cyan-500/50' : ''}`}></div>
                        </div>
                        <span className={`ml-4 font-bold text-lg transition-colors duration-300 ${allowContributions ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300' : 'text-gray-400'}`}>
                          {allowContributions ? '🎉 Collaborations Enabled!' : 'Enable Collaborations'}
                        </span>
                      </label>
                      
                      {allowContributions && (
                        <div className="mt-4 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 flex items-center gap-2">
                          <span className="text-cyan-400 text-lg">✓</span>
                          <span className="text-cyan-300 text-sm font-medium">Your story is now open for collaboration - other users can contribute!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <VerseList />
            </div>
          </div>
          
          <SubmitButtons />
          
          {/* Gradient borders */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
        </div>
      </div>
      
      <DeleteVerseConfirmation 
        isOpen={showDeleteVerseConfirmation}
        verseNumber={verseToDelete?.number}
        onConfirm={handleConfirmVerseDelete}
        onCancel={handleCancelVerseDelete}
      />
      
      <ConfirmationDialog 
        isOpen={showEmptyVerseConfirmation}
        title="Create Story Without Verses?"
        message="You're about to create a story with no verses (no content or images). Are you sure you want to continue?"
        onConfirm={proceedWithPublish}
        onCancel={cancelPublish}
      />
      
      <style jsx>{`
        /* Custom scrollbar for the modal content */
        .flex-1.overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        
        .flex-1.overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        
        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(6, 182, 212, 0.5), rgba(59, 130, 246, 0.5));
          border-radius: 10px;
        }
        
        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(6, 182, 212, 0.7), rgba(59, 130, 246, 0.7));
        }
        
        /* Enhanced focus states */
        input:focus, textarea:focus {
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
        }
        
        /* Enhanced button hover effects */
        button {
          position: relative;
          overflow: hidden;
        }
        
        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }
        
        button:hover::before {
          left: 100%;
        }
        
        /* Enhanced verse item styling */
        .verse-item {
          position: relative;
          overflow: hidden;
        }
        
        .verse-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        
        .verse-item:hover::before {
          opacity: 1;
        }

        /* Success message animation */
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-fade-in-down {
          animation: fadeInDown 0.3s ease-out forwards;
        }
        /* Enable smooth momentum scrolling on iOS/touch devices for the modal content */
        .modal-scroll {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </>
  );

  if (!isClient) {
    return null;
  }

  return createPortal(modal, document.body);
};

// Add displayName to StoryFormModal
StoryFormModal.displayName = 'StoryFormModal';

export default StoryFormModal;