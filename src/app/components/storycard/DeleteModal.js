import React from 'react';

const DeleteModal = ({ 
    showDeleteModal, 
    setShowDeleteModal, 
    story, 
    handleDeleteStory, 
    isDeleting 
}) => {
    if (!showDeleteModal) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center">
            <div className="w-full max-w-md bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-red-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 rounded-3xl border-2 border-red-500/30 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent h-px w-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md px-8 py-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 to-pink-600/30 flex items-center justify-center shadow-lg shadow-red-500/40 border border-red-500/30">
                            <i className="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Delete Story
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                This action cannot be undone
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 p-8">
                    <p className="text-gray-300 text-lg mb-2">
                        Are you sure you want to delete <span className="text-white font-semibold">&ldquo;{story.title}&rdquo;</span>?
                    </p>
                    <p className="text-gray-400 text-sm">
                        All verses and comments will be permanently removed.
                    </p>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-6">
                    <div className="flex justify-end gap-4">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="px-6 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteStory}
                            disabled={isDeleting}
                            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/30 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? (
                                <>
                                    <i className="fas fa-spinner animate-spin"></i>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-trash"></i>
                                    Delete Story
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;