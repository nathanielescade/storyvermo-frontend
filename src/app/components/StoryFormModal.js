"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { storiesApi, versesApi, momentsApi } from '../../../lib/api';

// Import components
import ConfirmationDialog from './storyformmodal/ConfirmationDialog';
import DeleteVerseConfirmation from './storyformmodal/DeleteVerseConfirmation';
import VerseItem from './storyformmodal/VerseItem';
import TagInput from './storyformmodal/TagInput';
import ModalHeader from './storyformmodal/ModalHeader';
import ImageUploadArea from './storyformmodal/ImageUploadArea';
import VerseList from './storyformmodal/VerseList';
import SubmitButtons from './storyformmodal/SubmitButtons';

// Default tags as fallback
const DEFAULT_TAGS = ['Fantasy', 'Adventure', 'Mystery', 'Romance', 'Sci-Fi', 
                      'Horror', 'Thriller', 'Poetry', 'Life', 'Travel',
                      'Food', 'Technology', 'Art', 'Music', 'History'];

// Title emoji quick-bar (moved 😞 to 7th position)
const TITLE_EMOJI_BAR = ['🔥','💯','🎉','😀','😍','🙌','😞','🌌'];

// Description character limit
const DESCRIPTION_CHAR_LIMIT = 700;

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
  const titleTextareaRef = useRef(null);
  const titleCaretRef = useRef({ start: 0, end: 0 });
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
  const versesRef = useRef(verses);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);
  
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

  // Insert emoji into title textarea without forcing focus (keeps mobile keyboard visible)
  const insertTitleEmoji = (emoji) => {
    try {
      const ta = titleTextareaRef.current;
      if (ta) {
        const caret = titleCaretRef.current || {};
        const start = (typeof caret.start === 'number' ? caret.start : (ta.selectionStart ?? ta.value.length));
        const end = (typeof caret.end === 'number' ? caret.end : (ta.selectionEnd ?? start));
        const newVal = (title || '').slice(0, start) + emoji + (title || '').slice(end);
        setTitle(newVal);
        requestAnimationFrame(() => {
          try {
            if (document.activeElement === ta) {
              const pos = start + emoji.length;
              ta.setSelectionRange(pos, pos);
            }
          } catch (e) {}
        });
        titleCaretRef.current = { start: start + emoji.length, end: start + emoji.length };
        return;
      }
      setTitle((s) => (s || '') + emoji);
    } catch (e) {
      setTitle((s) => (s || '') + emoji);
    }
  };
  
  // Check if all verses are empty (no images)
  const areAllVersesEmpty = useCallback(() => {
    return verses.every(verse => {
      const hasImages = verse.imageIds && verse.imageIds.length > 0;
      const hasContent = verse.content && verse.content.trim() !== '';
      return !hasImages && !hasContent;
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
        const preview = await generatePreview(file);
        setImageFile(file);
        setImagePreview(preview);
      } catch (err) {
        console.error(`[StoryFormModal] Image processing error:`, err);
        setError(`Failed to process image: ${err.message}`);
      }
    }
  }, [generatePreview]);
  
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

        // Generate previews for all files
        const itemsWithPreviews = await Promise.all(
          validFiles.map(async (f) => {
            const preview = await generatePreview(f.file);
            return {
              file: f.file,
              preview: preview,
              name: f.name,
              tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          })
        );

        // Add items to verse
        setVerses(prevVerses => 
          prevVerses.map(verse => 
            verse.id === verseId 
              ? { ...verse, imageIds: [...verse.imageIds, ...itemsWithPreviews] } 
              : verse
          )
        );

        // Reset input
        inputElement.value = '';
      }
    }
  }, [generatePreview]);
  
  // Handle verse content change
  const handleVerseContentChange = useCallback((verseId, content) => {
    setVerses(prevVerses => 
      prevVerses.map(verse => 
        verse.id === verseId ? { ...verse, content } : verse
      )
    );
  }, []);
  
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
      // Skip verses that are completely empty (no images and no content)
      const versesToProcess = updatedVerses.filter(verse => {
        const hasImages = (verse.uploadedImageIds || []).length > 0;
        const hasContent = verse.content && verse.content.trim() !== '';
        return hasImages || hasContent;
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

      // Generate previews for all files
      try {
        const itemsWithPreviews = await Promise.all(
          validFiles.map(async (file) => {
            const preview = await generatePreview(file);
            return {
              file: file,
              preview: preview,
              name: file.name,
              tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          })
        );

        // Add items to verse
        handleVerseImageUpload(verseId, itemsWithPreviews);
      } catch (error) {
        setError(`Failed to process images: ${error.message}`);
      }
    }
  }, [generatePreview, handleVerseImageUpload]);
  
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
          
          <ModalHeader 
            success={success}
            editingStory={editingStory}
            editingVerse={editingVerse}
            clearForm={clearForm}
            onClose={onClose}
          />
          
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
                
                <ImageUploadArea 
                  imagePreview={imagePreview}
                  title={title}
                  setImageFile={setImageFile}
                  setImagePreview={setImagePreview}
                  setError={setError}
                />
                
                {/* Title */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <span className="fas fa-heading text-cyan-400"></span> Title <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="mb-2 flex items-center gap-2 overflow-x-auto py-1">
                      {TITLE_EMOJI_BAR.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); insertTitleEmoji(em); }}
                          className="w-8 h-8 flex items-center justify-center text-base leading-none rounded-md hover:bg-gray-800/40"
                          aria-label={`Insert ${em}`}
                        >
                          <span className="inline-block leading-none">{em}</span>
                        </button>
                      ))}
                    </div>
                    <textarea 
                      id="story-title"
                      placeholder="Give your story a captivating title"
                      ref={titleTextareaRef}
                      value={title}
                      onChange={(e) => {
                        // Enforce 150 character limit
                        if (e.target.value.length <= 150) {
                          setTitle(e.target.value);
                          if (validationErrors.title) {
                            setValidationErrors(prev => ({...prev, title: null}));
                          }
                        }
                        // Auto-expand textarea (same behavior as comment textarea)
                        const textarea = e.target;
                        textarea.style.height = 'auto';
                        const MAX_TITLE_HEIGHT = 120;
                        const newHeight = Math.min(textarea.scrollHeight, MAX_TITLE_HEIGHT); // allow multi-line expansion up to ~120px
                        textarea.style.height = newHeight + 'px';
                        // Allow vertical scrolling when we've hit the max height
                        textarea.style.overflowY = newHeight >= MAX_TITLE_HEIGHT ? 'auto' : 'hidden';
                      }}
                      rows={1}
                      onSelect={(e) => {
                        try { const ta = e.target; titleCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd }; } catch (err) {}
                      }}
                      onKeyUp={(e) => {
                        try { const ta = e.target; titleCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd }; } catch (err) {}
                      }}
                      onMouseUp={(e) => {
                        try { const ta = e.target; titleCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd }; } catch (err) {}
                      }}
                      onTouchEnd={(e) => {
                        try { const ta = e.target; titleCaretRef.current = { start: ta.selectionStart, end: ta.selectionEnd }; } catch (err) {}
                      }}
                      className={`w-full px-5 py-2 bg-slate-900/60 border rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 text-lg resize-none overflow-y-auto ${
                        validationErrors.title ? 'border-red-500/50' : 'border-gray-700'
                      }`}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                  </div>
                  {title.length >= 150 && (
                    <p className="text-yellow-400 text-sm mt-2">⚠️ Character limit reached (150 characters max)</p>
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
                        // enforce max length
                        const nextVal = e.target.value.slice(0, DESCRIPTION_CHAR_LIMIT);
                        setDescription(nextVal);
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
                  {description.length >= DESCRIPTION_CHAR_LIMIT && (
                    <p className="text-yellow-400 text-sm mt-2">⚠️ Character limit reached ({DESCRIPTION_CHAR_LIMIT} characters max)</p>
                  )}
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
                  <div className="mb-8 p-6 rounded-3xl bg-slate-900/30 border-2 border-blue-500/40 shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                      <label className="block text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-4 flex items-center gap-3">
                        <span className="fas fa-users text-2xl text-blue-400"></span>
                        <span className="text-lg">Use Collaborations</span>
                      </label>

                      <p className="text-gray-300 text-sm mb-5 flex items-center gap-2">
                        <span className="text-blue-400">→</span> Allow other users to contribute verses to your story. Keep creative control or invite collaborators.
                      </p>

                      <label className="inline-flex items-center cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={allowContributions}
                            onChange={(e) => setAllowContributions(e.target.checked)}
                          />
                          <div className={`block w-16 h-9 rounded-full transition-all duration-300 ease-in-out ${allowContributions ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-500 shadow-lg' : 'bg-blue-50/40 border-2 border-blue-400/70 hover:border-blue-500'}`}></div>
                          <div className={`absolute left-1 top-1 bg-blue-100 w-7 h-7 rounded-full transition-all duration-300 ease-in-out ${allowContributions ? 'transform translate-x-7 shadow-[0_6px_18px_rgba(59,130,246,0.18)] border border-blue-300' : 'border border-blue-400 shadow-sm'}`}></div>
                        </div>
                        <span className={`ml-4 font-semibold text-lg transition-colors duration-300 ${allowContributions ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500' : 'text-gray-400'}`}>
                          {allowContributions ? 'Collaborations enabled' : 'Enable collaborations'}
                        </span>
                      </label>

                      {allowContributions && (
                        <div className="mt-4 p-3 rounded-xl bg-blue-950/10 border border-blue-500/30 flex items-center gap-2">
                          <span className="text-blue-400 text-lg">✓</span>
                          <span className="text-green-400 text-sm italic font-medium">Your story is open for collaboration — other users may contribute.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <VerseList 
                verses={verses}
                handleVerseImageUpload={handleVerseImageUpload}
                removeVerse={removeVerse}
                setDeletedMoments={setDeletedMoments}
                setVerses={setVerses}
                handleDeleteVerseClick={handleDeleteVerseClick}
                validationErrors={validationErrors}
                editingVerse={editingVerse}
                title={title}
                handleVerseContentChange={handleVerseContentChange}
                handleAddVerse={handleAddVerse}
              />
            </div>
          </div>
          
          <SubmitButtons 
            onClose={onClose}
            handlePublish={handlePublish}
            loading={loading}
            editingStory={editingStory}
            editingVerse={editingVerse}
          />
          
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

StoryFormModal.displayName = 'StoryFormModal';

export default StoryFormModal;