import React, { memo } from 'react';

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

TagInput.displayName = 'TagInput';

export default TagInput;