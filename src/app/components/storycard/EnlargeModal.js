import React, { useState } from 'react';

const EnlargeModal = ({ 
    showEnlargeModal, 
    setShowEnlargeModal, 
    story, 
    getCoverImageUrl 
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadImage = async () => {
        const coverImageUrl = getCoverImageUrl();
        if (!coverImageUrl) return;
        
        setIsDownloading(true);
        
        try {
            // Try to fetch the image as a blob first. Include credentials so
            // protected/private images that rely on session cookies will work.
            const response = await fetch(coverImageUrl, { credentials: 'include' });
            if (!response.ok) throw new Error('Network response was not ok');
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${story.title || 'story'}-cover.jpg`;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
                setIsDownloading(false);
            }, 100);
        } catch (error) {
            console.error('Download failed:', error);
            
            // Fallback to direct download — open in new tab. For cross-origin
            // images, this may still be blocked, but it's a last-resort fallback.
            const link = document.createElement('a');
            link.href = coverImageUrl;
            link.download = `${story.title || 'story'}-cover.jpg`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                setIsDownloading(false);
            }, 100);
        }
    };

    if (!showEnlargeModal) return null;

    const coverImageUrl = getCoverImageUrl();

    return (
        <>
            <div className="fixed top-4 left-4 right-4 flex justify-between z-[700] pointer-events-none">
                <button 
                    onClick={handleDownloadImage}
                    disabled={isDownloading}
                    className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 pointer-events-auto disabled:opacity-50"
                    title={isDownloading ? "Downloading..." : "Download image"}
                >
                    {isDownloading ? (
                        <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                        <i className="fas fa-download"></i>
                    )}
                </button>
                <button 
                    onClick={() => setShowEnlargeModal(false)}
                    className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 pointer-events-auto"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
            
            <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center" onClick={() => setShowEnlargeModal(false)}>
                <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                    {coverImageUrl ? (
                        // FIXED: Replaced Next.js Image with regular img tag for all URL types
                        <div className="relative w-full h-[80vh]">
                            <img 
                                src={coverImageUrl}
                                alt={story.title || 'Story cover'}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-96 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                            <div className="text-slate-600 text-5xl">
                                <i className="fas fa-image"></i>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default EnlargeModal;