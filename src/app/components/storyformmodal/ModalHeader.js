import React from 'react';

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

ModalHeader.displayName = 'ModalHeader';

export default ModalHeader;