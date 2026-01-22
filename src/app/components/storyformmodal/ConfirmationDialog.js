import React from 'react';

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

ConfirmationDialog.displayName = 'ConfirmationDialog';

export default ConfirmationDialog;