"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../../contexts/AuthContext';
import { storiesApi, versesApi, momentsApi } from '../../../lib/api';

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
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

// Optimized Verse Content Component with internal state
const VerseContent = memo(({ value, onChange, verseId, ...props }) => {
  const [internalValue, setInternalValue] = useState(value);
  const isFocused = useRef(false);
  
  // Update internal value when parent value changes
  useEffect(() => {
    if (!isFocused.current) {
      setInternalValue(value);
    }
  }, [value]);
  
  const handleChange = useCallback((e) => {
    setInternalValue(e.target.value);
  }, []);
  
  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);
  
  const handleBlur = useCallback(() => {
    isFocused.current = false;
    onChange(internalValue);
  }, [internalValue, onChange]);
  
  return (
    <textarea
      {...props}
      id={`verse-content-${verseId}`}
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
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
        {!isExisting && !isEditingVerse && (
          <button 
            onClick={() => onRemoveVerse(verse.id)}
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
          rows={3}
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
                      src={image} 
                      alt={title ? `${title} - Moment ${imgIndex + 1}` : `Moment ${imgIndex + 1}`} 
                      fill
                      className="object-cover rounded-xl border border-gray-700"
                      onError={(e) => {
                        console.error("Verse image failed to load:", e);
                        e.target.src = '';
                        e.target.alt = "Image failed to load";
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-36">
                    <Image 
                      src={image.preview || image.url || image.file_url || (image.file ? URL.createObjectURL(image.file) : '')} 
                      alt={title ? `${title} - Moment ${imgIndex + 1}` : `Moment ${imgIndex + 1}`} 
                      fill
                      className="object-cover rounded-xl border border-gray-700"
                      onError={(e) => {
                        console.error("Verse image failed to load:", e);
                        e.target.src = '';
                        e.target.alt = "Image failed to load";
                      }}
                    />
                  </div>
                )}
                <button 
                  onClick={() => onImageUpload(verse.id, imgIndex)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="fas fa-times"></span>
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
      console.error('Error loading tags:', err);
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
  
  // Handle image upload for post
  const handleImageUpload = (e) => {
    console.log('Handling image upload');
    const file = e.target.files[0];
    if (file) {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file must be less than 10MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = function(event) {
        console.log('File read successfully');
        setImagePreview(event.target.result);
      };
      reader.onerror = function(error) {
        console.error('Error reading file:', error);
        setError('Error reading the image file. Please try again.');
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };
  
  // Handle verse image upload
  const handleVerseImageUpload = useCallback((verseId, e) => {
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
      if (files.length > 0) {
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
          if (file.size > 10 * 1024 * 1024) {
            invalidFiles.push(`${file.name} is too large (>10MB)`);
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
          return;
        }
        
        setVerses(prevVerses => 
          prevVerses.map(verse => 
            verse.id === verseId 
              ? { 
                  ...verse, 
                  imageIds: [...verse.imageIds, ...validFiles.map(file => ({
                    file: file.file,
                    name: file.name,
                    tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  }))]
                } 
              : verse
          )
        );
        setError(null);
      }
    }
  }, []);
  
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
    if (verses.length > 1) {
      setVerses(verses.filter(verse => verse.id !== verseId || verse.isExisting));
    }
  }, [verses]);
  
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
// Modify the handlePublish function to properly handle verse updates
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

// Update the proceedWithPublish function
const proceedWithPublish = async () => {
  setShowEmptyVerseConfirmation(false);
  setLoading(true);
  setError(null);

  try {
    // Check authentication
    if (!isAuthenticated || !currentUser) {
      throw new Error('You must be logged in to perform this action');
    }

    // Helper function to upload a single image with better error handling
    const uploadImage = async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      
      // Get fresh CSRF token
      const csrfToken = getCsrfToken();
      
      const headers = {
        'X-CSRFToken': csrfToken
      };
      
      // Try to get token from meta tag if cookie method fails
      if (!csrfToken) {
        const metaToken = document.querySelector('[name=csrf-token]')?.getAttribute('content');
        if (metaToken) {
          headers['X-CSRFToken'] = metaToken;
        }
      }
      
      const res = await fetch(`/api/images/`, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: fd
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Image upload failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
          hasCSRF: !!csrfToken
        });
        
        // Provide more specific error messages
        if (res.status === 403) {
          throw new Error('Upload permission denied. Please try logging in again.');
        } else if (res.status === 401) {
          throw new Error('Session expired. Please refresh the page and try again.');
        } else {
          throw new Error(`Image upload failed: ${res.statusText}`);
        }
      }
      
      return await res.json();
    };

    // Upload all verse images first and collect their public_ids
    const versesWithUploadedImages = await Promise.all(
      verses.map(async (verse) => {
        const uploadedImageIds = [];
        
        for (const img of verse.imageIds || []) {
          if (img && (img.file instanceof File || img instanceof File)) {
            const file = img.file instanceof File ? img.file : img;
            try {
              const result = await uploadImage(file);
              uploadedImageIds.push(result.public_id);
            } catch (uploadErr) {
              console.error('Failed to upload verse image:', uploadErr);
              throw uploadErr;
            }
          } else if (typeof img === 'string') {
            uploadedImageIds.push(img);
          } else if (img && img.public_id) {
            uploadedImageIds.push(img.public_id);
          }
        }
        
        return {
          content: (verse.content || '').trim(),
          image_ids: uploadedImageIds,
          order: verse.order || 0,
          // Include the verse ID if it's an existing verse
          ...(verse.slug && { id: verse.slug })
        };
      })
    );

    // Prepare story payload with tags
    const storyPayload = {
      title: title.trim(),
      description: description.trim(),
      tags_input: selectedTags,
      allow_contributions: allowContributions,
      creator: currentUser.id || currentUser.pk || currentUser.username
    };

    // Handle cover image
    let finalCoverImageId = coverImageId;
    
    if (imageFile) {
      try {
        console.log('Uploading cover image...');
        const result = await uploadImage(imageFile);
        finalCoverImageId = result.public_id;
        console.log('Cover image uploaded:', finalCoverImageId);
      } catch (uploadErr) {
        console.error('Failed to upload cover image:', uploadErr);
        throw uploadErr;
      }
    }
    
    // Add cover image to payload if we have one
    if (finalCoverImageId) {
      storyPayload.cover_image_public_id = finalCoverImageId;
    }

    let savedStory;
    if (editingStory) {
      console.log('Updating story with payload:', storyPayload);
      savedStory = await storiesApi.updateStory(editingStory.slug, storyPayload);
    } else {
      console.log('Creating story with payload:', storyPayload);
      savedStory = await storiesApi.createStory(storyPayload);
    }

    // After creating/updating the story, handle verses
    const createdVerses = [];
    const storyIdentifier = savedStory?.public_id || savedStory?.id || savedStory?.slug;

    if (Array.isArray(versesWithUploadedImages) && storyIdentifier) {
      for (let i = 0; i < versesWithUploadedImages.length; i++) {
        const v = versesWithUploadedImages[i];
        try {
          const verseData = {
            story: storyIdentifier,
            content: v.content || '',
            order: v.order || i + 1,
            image_ids: v.image_ids || []
          };

          let verseResponse;
          
          // Check if this is an existing verse or a new one
          if (v.id && editingStory) {
            // This is an existing verse, update it
            verseResponse = await versesApi.updateVerse(v.id, verseData);
          } else {
            // This is a new verse, create it
            verseResponse = await versesApi.createVerse(verseData);
          }

          // Create moments for each image id
          const imageIds = v.image_ids || [];
          if (Array.isArray(imageIds) && imageIds.length > 0 && verseResponse) {
            for (let m = 0; m < imageIds.length; m++) {
              try {
                await momentsApi.createMoment({
                  verse: verseResponse.public_id || verseResponse.id,
                  image_id: imageIds[m],
                  order: m + 1
                });
              } catch (momentErr) {
                console.warn('Failed to create moment for verse', verseResponse, momentErr);
              }
            }
          }

          createdVerses.push(verseResponse);
        } catch (verseErr) {
          console.warn('Failed to create/update verse', v, verseErr);
        }
      }
    }

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

    // Notify server-side proxy to trigger revalidation and indexing without exposing the secret to the client.
    try {
      const csrf = getCsrfToken();
      // Fire-and-forget but log results for debugging
      fetch('/api/publish-proxy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
        },
        body: JSON.stringify({ slug: savedStory?.slug })
      })
        .then(async (r) => {
          try { const j = await r.json().catch(() => null); console.log('publish-proxy response', r.status, j); } catch(e){}
        })
        .catch((e) => console.warn('publish-proxy failed', e));
    } catch (e) {
      console.warn('publish-proxy invocation error', e);
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
    }, 2000);
  } catch (err) {
    console.error('Error saving story:', err);
    
    // Provide user-friendly error messages
    let errorMessage = 'An error occurred while saving the story. Please try again.';
    
    if (err.message.includes('permission denied') || err.message.includes('403')) {
      errorMessage = 'Upload permission denied. Please try refreshing the page and logging in again.';
    } else if (err.message.includes('Session expired') || err.message.includes('401')) {
      errorMessage = 'Your session has expired. Please refresh the page and try again.';
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
  
  // Handle verse image file selection
  const handleVerseImageFileChange = useCallback(async (verseId, e) => {
    console.log('Handling verse image file change for verse:', verseId);
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const validFiles = [];
      const invalidFiles = [];
      const imagePreviews = [];
      
      for (const file of files) {
        console.log('Processing file:', file.name);
        if (file.size > 10 * 1024 * 1024) {
          invalidFiles.push(`${file.name} is too large (>10MB)`);
        } else if (!file.type.startsWith('image/')) {
          invalidFiles.push(`${file.name} is not a valid image`);
        } else {
          validFiles.push(file);
          // Generate preview for each valid file
          try {
            const preview = await handleImagePreview(file);
            imagePreviews.push({
              file: file,
              preview: preview,
              name: file.name
            });
          } catch (error) {
            console.error("Error generating preview:", error);
            invalidFiles.push(`${file.name} preview failed`);
          }
        }
      }
      
      if (invalidFiles.length > 0) {
        setError(`Invalid files: ${invalidFiles.join(', ')}`);
        return;
      }
      
      console.log('Valid files processed:', validFiles.length);
      console.log('Image previews generated:', imagePreviews.length);
      
      // Pass both files and previews to the parent component
      handleVerseImageUpload(verseId, imagePreviews);
    }
  }, [handleImagePreview, handleVerseImageUpload]);
  
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

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select a valid image file');
          return;
        }
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError('Image file must be less than 10MB');
          return;
        }
        
        setImageFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target.result);
        };
        reader.onerror = () => {
          setError('Error reading file');
        };
        reader.readAsDataURL(file);
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
                <Image 
                  src={imagePreview} 
                  alt={title ? `${title} - Cover image` : 'Cover image'} 
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.error("Image failed to load:", e);
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
      <div className={`fixed inset-0 bg-black/90 backdrop-blur-xl z-[500] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
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
          <div className="flex-1 overflow-y-auto">
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
                    <input 
                      type="text" 
                      id="story-title"
                      placeholder="Give your story a captivating title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (validationErrors.title) {
                          setValidationErrors(prev => ({...prev, title: null}));
                        }
                      }}
                      className={`w-full px-5 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 text-lg ${
                        validationErrors.title ? 'border-red-500/50' : 'border-gray-700'
                      }`}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                  </div>
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
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 resize-none text-lg"
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
                
                {/* Allow contributions toggle */}
                {!editingVerse && (
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                      <span className="fas fa-users text-cyan-400"></span> Allow contributions
                    </label>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-transparent shadow-sm">
                      <label className="inline-flex items-center cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={allowContributions}
                            onChange={(e) => setAllowContributions(e.target.checked)}
                          />
                          <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${allowContributions ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gray-700'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${allowContributions ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <span className="ml-3 text-cyan-300 font-semibold text-lg">Allow other users to contribute verses to this story</span>
                      </label>
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