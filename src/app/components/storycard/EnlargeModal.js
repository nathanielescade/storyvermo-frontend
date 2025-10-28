import React from 'react';

const EnlargeModal = ({ 
    showEnlargeModal, 
    setShowEnlargeModal, 
    story, 
    getCoverImageUrl 
}) => {
    const handleDownloadImage = () => {
        const coverImageUrl = getCoverImageUrl();
        if (!coverImageUrl) return;
        
        const link = document.createElement('a');
        link.href = coverImageUrl;
        link.download = `${story.title || 'story'}-cover.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!showEnlargeModal) return null;

    const coverImageUrl = getCoverImageUrl();

    return (
        <>
            <div className="fixed top-4 left-4 right-4 flex justify-between z-[700] pointer-events-none">
                <button 
                    onClick={handleDownloadImage}
                    className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white z-10 hover:bg-black/80 pointer-events-auto"
                    title="Download image"
                >
                    <i className="fas fa-download"></i>
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
                        <img 
                            src={coverImageUrl} 
                            alt={story.title || 'Story cover'} 
                            className="w-full h-full object-contain rounded-xl"
                        />
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