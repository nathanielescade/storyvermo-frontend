import React from 'react';

const SubmitButtons = ({ onClose, handlePublish, loading, editingStory, editingVerse }) => {
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

SubmitButtons.displayName = 'SubmitButtons';

export default SubmitButtons;