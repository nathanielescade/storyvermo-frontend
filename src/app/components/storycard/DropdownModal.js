import React from 'react';

// Dropdown menu now supports an explicit coords prop so it can be positioned
// next to the clicked ellipsis. coords should be an object: { left, top }
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
    dropdownRef,
    coords, // { left, top }
    creatorUsername // Add this prop to pass the username
}) => {
    if (!showDropdown) return null;

    // Default coords guard
    const left = coords && coords.left ? coords.left : undefined;
    const top = coords && coords.top ? coords.top : undefined;

    // Inline style to position the menu. Use fixed positioning to avoid
    // stacking context/clipping issues; clamp to viewport if needed.
    const style = {};
    if (typeof window !== 'undefined' && left !== undefined) {
        // clamp left so menu doesn't overflow right edge (menu width ~ 208px)
        const menuWidth = 208;
        const maxLeft = Math.max(8, window.innerWidth - menuWidth - 8);
        style.left = Math.min(left, maxLeft) + 'px';
        style.position = 'fixed';
    }
    if (typeof window !== 'undefined' && top !== undefined) {
        style.top = (top + 6) + 'px'; // small gap below button
        style.position = 'fixed';
    }

    // fallback absolute classes if coords missing
    const baseClass = 'dropdown-menu z-50 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden';

    return (
        <div className={baseClass} style={style} ref={dropdownRef}>
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
                            onClick={(e) => handleFollow(e, creatorUsername)}
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