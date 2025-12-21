import React, { useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import { buildImageUrl } from '@/utils/cdn';

const VerseItem = memo(({ 
  verse, 
  index, 
  onImageUpload,
  onRemoveVerse,
  onDeleteMoment,
  onRemoveImage,
  onDeleteVerseClick,
  onVerseContentChange,
  validationErrors,
  isEditingVerse,
  title
}) => {
  const textareaRef = useRef(null);
  const isExisting = verse.isExisting;

  // Handle verse content change
  const handleVerseContentChange = useCallback((e) => {
    const newValue = e.target.value;
    // Update parent state directly
    onVerseContentChange(verse.id, newValue);
    
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200); // 200px ≈ 5 lines
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
          <span className="fas fa-pen text-purple-400"></span> Verse Content
          <span className="text-xs text-gray-500 ml-2">(optional)</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">You can add images/moments without text — the verse text is optional.</p>
        <div className="relative">
          <textarea 
            ref={textareaRef}
            placeholder="Describe your verse..."
            value={verse.content || ''}
            onChange={handleVerseContentChange}
            rows={2}
            className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none text-lg overflow-hidden"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          ></textarea>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
        </div>
      </div>
      
      {/* Verse Moments (Images) */}
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
        
        {/* Error message will show up here if no images are provided */}
        {validationErrors[`verse_${index}_empty`] && (
          <p className="text-red-400 text-sm mt-2">
            Please add at least one image
          </p>
        )}
      </div>
    </div>
  );
});

VerseItem.displayName = 'VerseItem';

export default VerseItem;