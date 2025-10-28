import React from 'react';

const DropdownMenu = ({ 
    showDropdown, 
    setShowDropdown, 
    isOwner, 
    isFollowing, 
    handleFollow, 
    handleEditStory, 
    handleDeleteStory, 
    handleCopyLink, 
    handleReportStory, 
    handleShareStory,
    dropdownRef 
}) => {
    if (!showDropdown) return null;

    return (
        <div className="dropdown-menu absolute right-0 top-8 z-20 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden" ref={dropdownRef}>
            {isOwner ? (
                <>
                    <button 
                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors"
                        onClick={handleEditStory}
                    >
                        <i className="fas fa-edit text-blue-400"></i>
                        <span>Edit Post</span>
                    </button>
                    <button 
                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                        onClick={handleDeleteStory}
                    >
                        <i className="fas fa-trash text-red-400"></i>
                        <span>Delete Post</span>
                    </button>
                </>
            ) : (
                <>
                    {!isFollowing && (
                        <button 
                            className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors"
                            onClick={handleFollow}
                        >
                            <i className="fas fa-user-plus text-green-400"></i>
                            <span>Follow User</span>
                        </button>
                    )}
                    <button 
                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                        onClick={handleReportStory}
                    >
                        <i className="fas fa-flag text-yellow-400"></i>
                        <span>Report Post</span>
                    </button>
                </>
            )}
            <button 
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                onClick={handleCopyLink}
            >
                <i className="fas fa-link text-green-400"></i>
                <span>Copy Link</span>
            </button>
            <button 
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 flex items-center gap-3 transition-colors border-t border-gray-800"
                onClick={handleShareStory}
            >
                <i className="fas fa-share text-green-400"></i>
                <span>Share Post</span>
            </button>
        </div>
    );
};

export default DropdownMenu;