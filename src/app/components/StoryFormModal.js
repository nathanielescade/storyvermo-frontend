"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { storiesApi, versesApi, momentsApi } from '../../../lib/api';
import Image from 'next/image';
import { buildImageUrl, normalizeUrl, isValidUrl } from '@/utils/cdn';

// Default tags as fallback
const DEFAULT_TAGS = ['Fantasy', 'Adventure', 'Mystery', 'Romance', 'Sci-Fi', 
                      'Horror', 'Thriller', 'Poetry', 'Life', 'Travel',
                      'Food', 'Technology', 'Art', 'Music', 'History'];

// Title emoji quick-bar
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

// --- Sub-components (Previously modularized, now inline) ---

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

const DeleteVerseConfirmation = ({ isOpen, verseNumber, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10200] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="fas fa-exclamation-triangle text-red-400"></span> Delete Verse?
        </h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete Verse #{verseNumber}? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg shadow-red-500/30"
          >
            Delete Verse
          </button>
        </div>
      </div>
    </div>
  );
};

const VerseItem = memo(({ 
  verse, 
  index, 
  onImageUpload,
  onDeleteVerseClick,
  onVerseContentChange,
  onVerseUrlChange,
  onVerseCtaTextChange,
  onRemoveImage,
  onDeleteMoment,
  isEditingVerse,
  title,
  isPremium = false
}) => {
  const textareaRef = useRef(null);
  const isExisting = verse.isExisting;

  const handleVerseContentChange = useCallback((e) => {
    const newValue = e.target.value;
    onVerseContentChange(verse.id, newValue);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200); 
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [verse.id, onVerseContentChange]);
  
  return (
    <div className={`verse-item bg-gradient-to-b ${isExisting ? 'from-slate-900/60 to-indigo-900/60' : 'from-slate-900/80 to-black/80'} border ${isExisting ? 'border-purple-500/40' : 'border-blue-900/30'} rounded-2xl p-8 mb-8`} id={`verse-${index}`}>
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center text-purple-400 text-sm font-bold">
            {index + 1}
          </span>
          Verse #{index + 1} {isExisting && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Existing</span>}
        </h4>
        {!isEditingVerse && (
          <button 
            onClick={() => onDeleteVerseClick(verse.id, index + 1)}
            className="w-10 h-10 rounded-full bg-red-500/30 hover:bg-red-500/40 flex items-center justify-center text-red-400 transition-all duration-300 border border-red-500/30"
            title="Remove verse"
          >
            <span className="fas fa-times"></span>
          </button>
        )}
      </div>
      
      <div className="space-y-4 mb-6">
        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="fas fa-pen text-purple-400"></span> Verse Content
        </label>
        <p className="text-xs text-gray-500 mb-2">You can add images/moments without text.</p>
        <div className="relative">
          <textarea 
            ref={textareaRef}
            placeholder="Describe your verse..."
            value={verse.content || ''}
            onChange={handleVerseContentChange}
            rows={2}
            className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none text-lg overflow-hidden"
          ></textarea>
        </div>
      </div>
      
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="fas fa-images text-purple-400"></span> Verse Moments (Images)
        </label>
        
        {verse.imageIds && verse.imageIds.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {verse.imageIds.map((image, imgIndex) => (
              <div key={`verse-${verse.id || index}-img-${imgIndex}`} className="relative group">
                {typeof image === 'string' ? (
                  <div className="relative w-full h-36">
                    <Image
                      src={buildImageUrl(image, { w: 1080, fmt: 'webp' })}
                      alt={title ? `${title} - Moment ${imgIndex + 1}` : `Moment ${imgIndex + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover rounded-xl border border-gray-700"
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
                    if (imageToDelete && imageToDelete.momentId) {
                      onDeleteMoment(imageToDelete.momentId);
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
      </div>
      
      <div className="space-y-4">
        {isPremium && (
          <>
            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <i className="fas fa-link text-purple-400"></i> Verse Link (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">Add a secure HTTPS link for this verse</p>
            <div className="relative">
              <input 
                type="text"
                placeholder="https://example.com"
                value={verse.url || ''}
                onChange={(e) => onVerseUrlChange(verse.id, e.target.value)}
                className="w-full px-5 py-2 pr-12 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
              />
              {verse.url && (
                <button
                  type="button"
                  onClick={() => onVerseUrlChange(verse.id, '')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200 z-10"
                  title="Clear URL"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              )}
            </div>
            {verse.url && isValidUrl(verse.url) ? (
              <p className="text-green-400 text-xs mt-2">✅ Valid URL</p>
            ) : verse.url ? (
              <p className="text-red-400 text-xs mt-2">❌ Invalid URL format</p>
            ) : null}
          </>
        )}
      </div>
      
      <div className="space-y-4">
        {isPremium && (
          <>
            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <i className="fas fa-mouse-pointer text-purple-400"></i> Button Text (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">Customize the CTA button text</p>
            <div className="relative">
              <input 
                type="text"
                placeholder="e.g., Book Now, Learn More, Visit"
                value={verse.cta_text || ''}
                onChange={(e) => onVerseCtaTextChange(verse.id, e.target.value.slice(0, 50))}
                className="w-full px-5 py-2 pr-12 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
                disabled={!verse.url || !isValidUrl(verse.url)}
              />
              {verse.cta_text && (
                <button
                  type="button"
                  onClick={() => onVerseCtaTextChange(verse.id, '')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200 z-10"
                  title="Clear button text"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              )}
            </div>
            {verse.url && !isValidUrl(verse.url) && (
              <p className="text-amber-400 text-xs mt-2">⚠️ Add a valid URL to use CTA text</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{(verse.cta_text || '').length}/50 characters</p>
          </>
        )}
      </div>
    </div>
  );
});

VerseItem.displayName = 'VerseItem';

const VerseList = ({ 
  verses, 
  handleVerseImageUpload, 
  handleDeleteVerseClick, 
  handleVerseContentChange,
  handleVerseUrlChange,
  handleVerseCtaTextChange,
  handleAddVerse,
  setDeletedMoments,
  setVerses,
  validationErrors, 
  editingVerse, 
  title,
  isPremium = false
}) => {
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
            onImageUpload={handleVerseImageUpload}
            onDeleteVerseClick={handleDeleteVerseClick}
            onVerseContentChange={handleVerseContentChange}
            onVerseUrlChange={handleVerseUrlChange}
            onVerseCtaTextChange={handleVerseCtaTextChange}
            isPremium={isPremium}
            onRemoveImage={(verseId, imgIndex) => {
              setVerses(prevVerses => 
                prevVerses.map(v => {
                  if (v.id === verseId) {
                    const newImageIds = [...v.imageIds];
                    const removed = newImageIds.splice(imgIndex, 1);
                    try {
                      if (removed && removed[0] && removed[0].preview && typeof removed[0].preview === 'string' && removed[0].preview.startsWith('blob:')) {
                        URL.revokeObjectURL(removed[0].preview);
                      }
                    } catch (e) {}
                    return { ...v, imageIds: newImageIds };
                  }
                  return v;
                })
              );
            }}
            onDeleteMoment={(momentId) => setDeletedMoments(prev => [...prev, momentId])}
            validationErrors={validationErrors}
            isEditingVerse={!!editingVerse}
            title={title}
          />
        ))}
      </div>
      
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

TagInput.displayName = 'TagInput';

const ModalHeader = ({ success, editingStory, editingVerse, clearForm, onClose }) => {
  const getModalTitle = () => {
    if (editingStory) return 'EDIT STORY';
    if (editingVerse) return 'EDIT VERSE';
    return 'CREATE NEW STORY';
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

const ImageUploadArea = ({ imagePreview, title, setImageFile, setImagePreview, setError }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const inputElement = e.target;
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        inputElement.value = '';
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        setError('Image file must be less than 50MB');
        inputElement.value = '';
        return;
      }
      
      try {
        setError(null);
        const preview = URL.createObjectURL(file);
        setImagePreview(preview);
        setImageFile(file);
        inputElement.value = '';
      } catch (err) {
        setError(`Failed to process image: ${err.message}`);
        inputElement.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeImage = () => {
    try {
      if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    } catch (e) {}
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
            <p className="text-gray-500 text-sm mt-2">JPG, PNG, GIF up to 50MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SubmitButtons = ({ onClose, handlePublish, loading, editingStory, editingVerse, publishProgress }) => {
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
        <div className="relative">
          <button
            onClick={handlePublish}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
          >
            {loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{
                width: '100%',
                height: '100%',
                transform: `translateX(${publishProgress * 2 - 100}%)`,
                transition: 'transform 0.3s ease-out'
              }}></div>
            )}
            <span className="relative z-10 flex items-center gap-3">
              {loading ? (
                <>
                  <span className="fas fa-spinner animate-spin"></span>
                  {isEditing ? 'Updating...' : 'Publishing...'}
                  {publishProgress > 0 && <span className="text-xs opacity-75">({publishProgress}%)</span>}
                </>
              ) : (
                <>
                  <span className="fas fa-rocket text-xl"></span>
                  {isEditing ? 'Update' : 'Publish Story'}
                </>
              )}
            </span>
          </button>
          {loading && publishProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-2xl overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 transition-all duration-300"
                style={{ width: `${publishProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

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
  const [storyUrl, setStoryUrl] = useState(editingStory?.url || '');
  const titleTextareaRef = useRef(null);
  const titleCaretRef = useRef({ start: 0, end: 0 });
  const [description, setDescription] = useState(editingStory?.description || editingVerse?.description || '');
  const [verses, setVerses] = useState(editingVerse ? 
    [{ 
      id: editingVerse.slug || generateUniqueId(), 
      content: editingVerse.content || '',
      url: editingVerse.url || '',
      cta_text: editingVerse.cta_text || '',
      isExisting: true,
      imageIds: editingVerse.moments?.filter(m => m.image).map(m => ({ 
        public_id: m.image.public_id,
        file_url: m.image.file_url,
        momentId: m.id || m.public_id
      })) || [], 
      slug: editingVerse.slug
    }] : 
    editingStory?.verses?.map(verse => ({
      id: verse.slug || generateUniqueId(),
      content: verse.content || '',
      url: verse.url || '',
      cta_text: verse.cta_text || '',
      isExisting: true,
      imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
        public_id: m.image.public_id,
        file_url: m.image.file_url,
        momentId: m.id || m.public_id
      })) || [],
      slug: verse.slug
    })) || [{ id: generateUniqueId(), content: '', url: '', cta_text: '', isExisting: false, imageIds: [] }]
  );
  const [loading, setLoading] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
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
  const [requestFeature, setRequestFeature] = useState(editingStory?.feature_request_status === 'pending' || false);
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
  
  const fetchPopularTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError(null);
    
    try {
      const response = await fetch(`/api/tags/popular/`);
      if (response.ok) {
        const data = await response.json();
        const sortedTags = data.sort((a, b) => b.usage_count - a.usage_count).map(tag => tag.name);
        setAvailableTags(sortedTags);
      } else {
        throw new Error('Failed to fetch popular tags');
      }
    } catch (err) {
      setTagsError('Failed to load popular tags');
      setAvailableTags(DEFAULT_TAGS);
    } finally {
      setTagsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      fetchPopularTags();
    }
  }, [isOpen, fetchPopularTags]);
  
  useEffect(() => {
    if (editingStory) {
      setTitle(editingStory.title || '');
      setDescription(editingStory.description || '');
      setImagePreview(editingStory.cover_image?.file_url || null);
      setCoverImageId(editingStory.cover_image?.public_id || null);
      setSelectedTags((editingStory.tags || []).map(tag => (typeof tag === 'string' ? tag : (tag && (tag.name || tag.slug) ? (tag.name || tag.slug) : String(tag)))));
      setAllowContributions(editingStory.allow_contributions || false);
      
      const hasVerses = editingStory.verses && editingStory.verses.length > 0;
      const hasVerseImages = hasVerses && editingStory.verses.some(v => v.moments && v.moments.length > 0);
      
      if (!hasVerses || !hasVerseImages) {
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
                  file_url: m.image.file_url,
                  momentId: m.id || m.public_id
                })) || [],
                slug: verse.slug
              })));
              return;
            }
          } catch (err) {
          }
          
          if (editingStory.verses && editingStory.verses.length > 0) {
            setVerses(editingStory.verses.map(verse => ({
              id: verse.slug || generateUniqueId(),
              content: verse.content || '',
              isExisting: true,
              imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
                public_id: m.image.public_id,
                file_url: m.image.file_url,
                momentId: m.id || m.public_id
              })) || [],
              slug: verse.slug
            })));
          } else {
            setVerses([{ id: generateUniqueId(), content: '', isExisting: false, imageIds: [] }]);
          }
        })();
      } else {
        setVerses(editingStory.verses.map(verse => ({
          id: verse.slug || generateUniqueId(),
          content: verse.content || '',
          isExisting: true,
          imageIds: verse.moments?.filter(m => m.image).map(m => ({ 
            public_id: m.image.public_id,
            file_url: m.image.file_url,
            momentId: m.id || m.public_id
          })) || [],
          slug: verse.slug
        })));
      }
    }
  }, [editingStory]);

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
  
  const areAllVersesEmpty = useCallback(() => {
    return verses.every(verse => {
      const hasImages = verse.imageIds && verse.imageIds.length > 0;
      const hasContent = verse.content && verse.content.trim() !== '';
      return !hasImages && !hasContent;
    });
  }, [verses]);
  
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
  
  const scrollToFirstError = useCallback((firstErrorField) => {
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        element.classList.add('ring-2', 'ring-red-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500');
        }, 2000);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.focus();
        }
      }
    }
  }, []);

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
          inputElement.value = '';
          return;
        }

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

        setVerses(prevVerses => 
          prevVerses.map(verse => 
            verse.id === verseId 
              ? { ...verse, imageIds: [...verse.imageIds, ...itemsWithPreviews] } 
              : verse
          )
        );

        inputElement.value = '';
      }
    }
  }, [generatePreview]);
  
  const handleVerseContentChange = useCallback((verseId, content) => {
    setVerses(prevVerses => 
      prevVerses.map(verse => 
        verse.id === verseId ? { ...verse, content } : verse
      )
    );
  }, []);
  
  const handleVerseUrlChange = useCallback((verseId, url) => {
    // Normalize URL when setting (allows www.example.com or plain domain)
    const normalizedUrl = url ? normalizeUrl(url) : '';
    setVerses(prevVerses => 
      prevVerses.map(verse => 
        verse.id === verseId ? { ...verse, url: normalizedUrl } : verse
      )
    );
  }, []);
  
  const handleVerseCtaTextChange = useCallback((verseId, cta_text) => {
    setVerses(prevVerses => 
      prevVerses.map(verse => 
        verse.id === verseId ? { ...verse, cta_text } : verse
      )
    );
  }, []);
  
  const handleTagInputChange = useCallback((e) => {
    setTagInput(e.target.value);
  }, []);
  
  const addTag = useCallback(() => {
    if (selectedTags.length >= 5) {
      alert('Maximum 5 tags per story');
      return;
    }
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags([...selectedTags, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, selectedTags]);
  
  const addTagByValue = useCallback((tagValue) => {
    if (selectedTags.length >= 5) {
      alert('Maximum 5 tags per story');
      return;
    }
    if (tagValue.trim() && !selectedTags.includes(tagValue.trim())) {
      setSelectedTags([...selectedTags, tagValue.trim()]);
    }
  }, [selectedTags]);
  
  const removeTag = useCallback((tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  }, [selectedTags]);
  
  const addNewVerse = useCallback(() => {
    setVerses(prevVerses => [...prevVerses, { id: generateUniqueId(), content: '', isExisting: false, imageIds: [] }]);
  }, []);
  
  const removeVerse = useCallback((verseId) => {
    const verseToRemove = verses.find(v => v.id === verseId);
    
    if (verseToRemove && verseToRemove.isExisting && verseToRemove.slug) {
      setDeletedVerses(prev => [...prev, verseToRemove.slug]);
      
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

  const handleDeleteVerseClick = useCallback((verseId, verseNumber) => {
    setVerseToDelete({ id: verseId, number: verseNumber });
    setShowDeleteVerseConfirmation(true);
  }, []);

  const handleConfirmVerseDelete = useCallback(() => {
    if (verseToDelete) {
      removeVerse(verseToDelete.id);
      setShowDeleteVerseConfirmation(false);
      setVerseToDelete(null);
    }
  }, [verseToDelete, removeVerse]);

  const handleCancelVerseDelete = useCallback(() => {
    setShowDeleteVerseConfirmation(false);
    setVerseToDelete(null);
  }, []);
  
  const scrollToVerses = useCallback(() => {
    const versesSection = document.getElementById('versesContainer');
    if (versesSection) {
      versesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
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
  
  const handlePublish = async () => {
    const { isValid, firstErrorField } = validateForm();
    
    if (!isValid) {
      setError('Please fix the validation errors below');
      scrollToFirstError(firstErrorField);
      return;
    }

    if (areAllVersesEmpty()) {
      setShowEmptyVerseConfirmation(true);
      return;
    }

    await proceedWithPublish();
  };

  const uploadImageWithProgress = async (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
      
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
          } catch (e) {}
          reject(new Error(errorMessage));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name || '');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      xhr.open('POST', '/api/images/', true);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const proceedWithPublish = async () => {
    setShowEmptyVerseConfirmation(false);
    setLoading(true);
    setPublishProgress(0);
    setError(null);

    try {
      if (!isAuthenticated || !currentUser) {
        throw new Error('You must be logged in to perform this action');
      }

      setPublishProgress(5); // Initial progress

      const allImagesToUpload = [];
      
      if (imageFile) {
        allImagesToUpload.push({
          file: imageFile,
          type: 'cover',
          onProgress: (percent) => {}
        });
      }
      
      verses.forEach((verse, verseIndex) => {
        (verse.imageIds || []).forEach((img, imgIndex) => {
          if (img && (img.file instanceof File || img instanceof File)) {
            const file = img.file instanceof File ? img.file : img;
            allImagesToUpload.push({
              file: file,
              type: 'verse',
              verseIndex,
              imgIndex,
              onProgress: (percent) => {}
            });
          }
        });
      });

      const uploadPromises = allImagesToUpload.map(img => 
        uploadImageWithProgress(img.file, img.onProgress)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      setPublishProgress(30); // After image uploads
      
      let resultIndex = 0;
      let finalCoverImageId = coverImageId;
      
      if (imageFile) {
        finalCoverImageId = uploadResults[resultIndex].public_id;
        resultIndex++;
      }
      
      const updatedVerses = verses.map(verse => {
        const uploadedImageIds = [];
        
        (verse.imageIds || []).forEach(img => {
          if (typeof img === 'string') {
            uploadedImageIds.push(img);
          } else if (img && img.public_id) {
            uploadedImageIds.push(img.public_id);
          } else if (img && (img.file instanceof File || img instanceof File)) {
            if (resultIndex < uploadResults.length) {
              uploadedImageIds.push(uploadResults[resultIndex].public_id);
              resultIndex++;
            }
          }
        });
        
        return {
          ...verse,
          uploadedImageIds,
          url: verse.url || '',
          cta_text: verse.cta_text || ''
        };
      });

      const storyPayload = {
        title: title.trim(),
        description: description.trim(),
        tags_input: selectedTags,
        allow_contributions: allowContributions,
        creator: currentUser.id || currentUser.pk || currentUser.username
      };

      // Add feature request status for premium users
      const isPremium = currentUser?.profile?.is_premium || currentUser?.is_premium || false;
      if (isPremium) {
        storyPayload.feature_request_status = requestFeature ? 'pending' : 'none';
      }

      if (finalCoverImageId) {
        storyPayload.cover_image_public_id = finalCoverImageId;
      }

      if (storyUrl && isValidUrl(storyUrl)) {
        storyPayload.url = normalizeUrl(storyUrl.trim());
      }

      let savedStory;
      if (editingStory) {
        savedStory = await storiesApi.updateStory(editingStory.slug, storyPayload);
      } else {
        savedStory = await storiesApi.createStory(storyPayload);
      }
      
      setPublishProgress(50); // After story creation/update

      if (deletedMoments.length > 0) {
        const momentDeletePromises = deletedMoments.map(momentId => 
          momentsApi.deleteMoment(momentId).catch(err => {})
        );
        await Promise.all(momentDeletePromises);
      }

      if (deletedVerses.length > 0) {
        const verseDeletePromises = deletedVerses.map(verseSlug => 
          versesApi.deleteVerse(verseSlug).catch(err => {})
        );
        await Promise.all(verseDeletePromises);
      }

      const storyIdentifier = savedStory?.public_id || savedStory?.id || savedStory?.slug;
      
      const versesToProcess = updatedVerses.filter(verse => {
        const hasImages = (verse.uploadedImageIds || []).length > 0;
        const hasContent = verse.content && verse.content.trim() !== '';
        const hasUrl = verse.url && isValidUrl(verse.url);
        const hasCTA = verse.cta_text && verse.cta_text.trim();
        return hasImages || hasContent || hasUrl || hasCTA;
      });

      const versePromises = versesToProcess.map(async (verse, index) => {
        const verseData = {
          story: storyIdentifier,
          content: (verse.content || '').trim(),
          order: verse.order || index + 1,
          image_ids: verse.uploadedImageIds || []
        };
        
        // Add URL and CTA if provided (only for premium users)
        const isPremium = currentUser?.profile?.is_premium || currentUser?.is_premium;
        if (isPremium) {
          if (verse.url && isValidUrl(verse.url)) {
            verseData.url = normalizeUrl(verse.url.trim());
          }
          if (verse.cta_text && verse.cta_text.trim()) {
            verseData.cta_text = verse.cta_text.trim();
          }
        }

        let verseResponse;
        
        if (verse.slug && editingStory) {
          verseResponse = await versesApi.updateVerse(verse.slug, verseData);
        } else {
          verseResponse = await versesApi.createVerse(verseData);
        }

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

      const createdVerses = await Promise.all(versePromises);

      setPublishProgress(75); // After verses created
      
      if (createdVerses.length > 0) {
        try {
          savedStory.verses = createdVerses;
        } catch (e) {}
      }

      setSuccess(editingStory ? 'Story updated successfully!' : 'Story created successfully!');
      setPublishProgress(90); // Almost done
      if (onUpdateStory) {
        onUpdateStory(savedStory, !editingStory);
      }

      setDeletedVerses([]);
      setDeletedMoments([]);

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
      } catch (e) {}

      setTimeout(() => {
        setPublishProgress(100); // Complete
        onClose();
        setSuccess(null);
        setPublishProgress(0); // Reset
        if (savedStory.slug) {
          router.push(`/stories/${savedStory.slug}`);
        } else if (editingStory && editingStory.slug) {
          router.push(`/stories/${editingStory.slug}`);
        }
      }, 1500);
    } catch (err) {
      
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
      setPublishProgress(0); // Reset progress on error
    }
  };
  
  const cancelPublish = () => {
    setShowEmptyVerseConfirmation(false);
    scrollToVerses();
  };
  
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
  
  verseRefs.current = verses.map((_, i) => verseRefs.current[i] ?? React.createRef());
  
  const scrollToVerse = useCallback((index) => {
    if (verseRefs.current[index] && verseRefs.current[index].current) {
      verseRefs.current[index].current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      const contentInput = verseRefs.current[index].current.querySelector('textarea');
      if (contentInput) {
        setTimeout(() => {
          contentInput.focus();
        }, 300);
      }
    }
  }, []);
  
  const handleAddVerse = useCallback(() => {
    addNewVerse();
    setTimeout(() => {
      scrollToVerse(verses.length);
    }, 100);
  }, [addNewVerse, scrollToVerse, verses.length]);
  
  const modal = (
    <>
      <div className={`fixed inset-0 bg-black/90 backdrop-blur-xl z-[10100] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
        <div className={`flex flex-col h-full transform transition-transform duration-500 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
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
          
          <div className="flex-1 overflow-y-auto touch-auto overscroll-contain modal-scroll">
            <div className="p-8">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
                  {error}
                </div>
              )}
              
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
                        if (e.target.value.length <= 150) {
                          setTitle(e.target.value);
                          if (validationErrors.title) {
                            setValidationErrors(prev => ({...prev, title: null}));
                          }
                        }
                        const textarea = e.target;
                        textarea.style.height = 'auto';
                        const MAX_TITLE_HEIGHT = 120;
                        const newHeight = Math.min(textarea.scrollHeight, MAX_TITLE_HEIGHT);
                        textarea.style.height = newHeight + 'px';
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
                
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <span className="fas fa-align-left text-cyan-400"></span> Description
                  </label>
                  <div className="relative">
                    <textarea 
                      placeholder="Share your story, thoughts, or experiences..."
                      value={description}
                      onChange={(e) => {
                        const nextVal = e.target.value.slice(0, DESCRIPTION_CHAR_LIMIT);
                        setDescription(nextVal);
                        const textarea = e.target;
                        textarea.style.height = 'auto';
                        const newHeight = Math.min(textarea.scrollHeight, 200); 
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
                
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <span className="fas fa-link text-cyan-400"></span> Story Link (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Add a secure link (https:// only) to your website, social media, WhatsApp, etc.</p>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="https://example.com or https://wa.me/... or https://instagram.com/..."
                      value={storyUrl}
                      onChange={(e) => {
                        setStoryUrl(normalizeUrl(e.target.value));
                      }}
                      className="w-full px-5 py-2 pr-12 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300 text-lg"
                    />
                    {storyUrl && (
                      <button
                        type="button"
                        onClick={() => setStoryUrl('')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200 z-10"
                        title="Clear URL"
                      >
                        <i className="fas fa-times text-lg"></i>
                      </button>
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                  </div>
                  {storyUrl && isValidUrl(storyUrl) ? (
                    <p className="text-green-400 text-sm mt-2">✅ Valid URL</p>
                  ) : storyUrl ? (
                    <p className="text-red-400 text-sm mt-2">❌ Invalid URL format</p>
                  ) : null}
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

                      {(currentUser?.profile?.is_premium || currentUser?.is_premium) && (
                        <div className="mt-6 pt-6 border-t border-blue-500/20">
                          <label className="block text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-4 flex items-center gap-3">
                            <span className="fas fa-star text-2xl text-yellow-400"></span>
                            <span className="text-lg">Featured Story</span>
                          </label>

                          <p className="text-gray-300 text-sm mb-5 flex items-center gap-2">
                            <span className="text-yellow-400">→</span> Request your story to be featured in the Explore tab for premium business content discovery.
                          </p>

                          <label className="inline-flex items-center cursor-pointer group">
                            <div className="relative">
                              <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={requestFeature}
                                onChange={(e) => setRequestFeature(e.target.checked)}
                              />
                              <div className={`block w-16 h-9 rounded-full transition-all duration-300 ease-in-out ${requestFeature ? 'bg-gradient-to-r from-yellow-500 to-amber-600 border-2 border-yellow-500 shadow-lg' : 'bg-blue-50/40 border-2 border-blue-400/70 hover:border-blue-500'}`}></div>
                              <div className={`absolute left-1 top-1 bg-blue-100 w-7 h-7 rounded-full transition-all duration-300 ease-in-out ${requestFeature ? 'transform translate-x-7 shadow-[0_6px_18px_rgba(234,179,8,0.18)] border border-yellow-300' : 'border border-blue-400 shadow-sm'}`}></div>
                            </div>
                            <span className={`ml-4 font-semibold text-lg transition-colors duration-300 ${requestFeature ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500' : 'text-gray-400'}`}>
                              {requestFeature ? 'Feature request pending' : 'Request to feature'}
                            </span>
                          </label>

                          {requestFeature && (
                            <div className="mt-4 p-3 rounded-xl bg-yellow-950/10 border border-yellow-500/30 flex items-center gap-2">
                              <span className="text-yellow-400 text-lg">★</span>
                              <span className="text-yellow-400 text-sm italic font-medium">Your story will be reviewed for the Explore tab — we feature high-quality premium content.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <VerseList 
                verses={verses}
                handleVerseImageUpload={handleVerseImageUpload}
                setDeletedMoments={setDeletedMoments}
                setVerses={setVerses}
                handleDeleteVerseClick={handleDeleteVerseClick}
                validationErrors={validationErrors}
                editingVerse={editingVerse}
                title={title}
                handleVerseContentChange={handleVerseContentChange}
                handleVerseUrlChange={handleVerseUrlChange}
                handleVerseCtaTextChange={handleVerseCtaTextChange}
                handleAddVerse={handleAddVerse}
                isPremium={currentUser?.profile?.is_premium || currentUser?.is_premium || false}
              />
            </div>
          </div>
          
          <SubmitButtons 
            onClose={onClose}
            handlePublish={handlePublish}
            loading={loading}
            editingStory={editingStory}
            editingVerse={editingVerse}
            publishProgress={publishProgress}
          />
          
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
        
        input:focus, textarea:focus {
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
        }
        
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