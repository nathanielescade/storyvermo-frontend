import React, { useState } from 'react';
import Image from 'next/image';

const EnlargeModal = ({ 
    showEnlargeModal, 
    setShowEnlargeModal, 
    story, 
    getCoverImageUrl 
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadImage = async () => {
        const coverImageUrl = getCoverImageUrl();
        if (!coverImageUrl) {
            alert('No image available to download');
            return;
        }
        
        setIsDownloading(true);
        
        try {
            // Fetch the image as a blob with credentials
            const response = await fetch(coverImageUrl, { 
                credentials: 'include',
                mode: 'cors'
            });
            
            if (!response.ok) throw new Error('Failed to fetch image');
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Create and trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${(story.title || 'story').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-cover.jpg`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            }, 100);
            
            // Show success message
            alert('Image downloaded successfully!');
            
        } catch (error) {
            
            // FALLBACK: Try using canvas to convert and download
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(function(blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = `${(story.title || 'story').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-cover.jpg`;
                        link.style.display = 'none';
                        
                        document.body.appendChild(link);
                        link.click();
                        
                        setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(blobUrl);
                        }, 100);
                        
                        alert('Image downloaded successfully!');
                    }, 'image/jpeg', 0.95);
                };
                
                img.onerror = function() {
                    alert('Unable to download image. Try right-click > Save image as...');
                };
                
                img.src = coverImageUrl;
                
            } catch (canvasError) {
                alert('Unable to download image. Try right-click > Save image as...');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    if (!showEnlargeModal) return null;

    const coverImageUrl = getCoverImageUrl();

    return (
        <>
            <div className="fixed top-4 left-4 right-4 flex justify-between z-[10101] pointer-events-none">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage();
                    }}
                    disabled={isDownloading}
                    className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 transition-all pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isDownloading ? "Downloading..." : "Download image"}
                >
                    {isDownloading ? (
                        <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                        <i className="fas fa-download"></i>
                    )}
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowEnlargeModal(false);
                    }}
                    className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 transition-all pointer-events-auto"
                    title="Close"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
            
            <div 
                className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[10100] flex items-center justify-center" 
                onClick={() => setShowEnlargeModal(false)}
            >
                <div className="relative max-w-4xl max-h-[90vh] w-full px-4" onClick={e => e.stopPropagation()}>
                    {coverImageUrl ? (
                        <div className="relative w-full h-[80vh]">
                            <Image 
                                src={coverImageUrl}
                                alt={story.title || 'Story cover'}
                                fill
                                className="object-contain"
                                quality={75}
                                crossOrigin="anonymous"
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