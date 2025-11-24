// ContributeModal.js
import { useState, useRef, useEffect } from 'react';
import { Modal, Box, TextField, Button, CircularProgress, IconButton } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { X as CloseIcon } from 'lucide-react';
import Image from 'next/image';
import { getCsrfToken } from '../../../../lib/utils';
import { versesApi, momentsApi, imagesApi } from '../../../../lib/api';

const ContributeModal = ({ 
    showContributeModal, 
    setShowContributeModal, 
    story,
    editingVerse,
    onStoryUpdated
}) => {
    const [verseContent, setVerseContent] = useState('');
    const [verseImages, setVerseImages] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Initialize form when editingVerse changes
    useEffect(() => {
        if (editingVerse) {
            setVerseContent(editingVerse.content || '');
            
            // Load existing images if any
            const images = [];
            if (editingVerse.moments && editingVerse.moments.length > 0) {
                editingVerse.moments.forEach((moment, index) => {
                    if (moment.image) {
                        // Create a preview URL for existing images
                        const imageUrl = moment.image.file_url || moment.image.url;
                        if (imageUrl) {
                            images.push({
                                file: null, // No file object for existing images
                                preview: imageUrl,
                                name: moment.image.alt_text || `Image ${index + 1}`,
                                existing: true, // Flag to indicate this is an existing image
                                public_id: moment.image.public_id,
                                moment_id: moment.public_id
                            });
                        }
                    }
                });
            }
            setVerseImages(images);
        } else {
            // Reset form when not editing
            setVerseContent('');
            setVerseImages([]);
        }
    }, [editingVerse]);

    // Helper function to get CSRF token
    const getCsrfToken = () => {
        if (typeof document === 'undefined') return '';
        const value = `; ${document.cookie}`;
        const parts = value.split(`; csrftoken=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const validFiles = [];
            const invalidFiles = [];
            const imagePreviews = [];
            
            for (const file of files) {
                if (file.size > 10 * 1024 * 1024) {
                    invalidFiles.push(`${file.name} is too large (>10MB)`);
                } else if (!file.type.startsWith('image/')) {
                    invalidFiles.push(`${file.name} is not a valid image`);
                } else {
                    validFiles.push(file);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imagePreviews.push({
                            file: file,
                            preview: event.target.result,
                            name: file.name,
                            existing: false // Flag to indicate this is a new image
                        });
                        
                        if (imagePreviews.length === validFiles.length) {
                            setVerseImages(prev => [...prev, ...imagePreviews]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
            
            if (invalidFiles.length > 0) {
                alert(`Invalid files: ${invalidFiles.join(', ')}`);
            }
        }
    };

    const removeImage = (index) => {
        setVerseImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitContribution = async () => {
        if (!verseContent.trim() && verseImages.length === 0) {
            alert('Please add either text content or at least one image to your verse.');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            let verseResponse;
            
            if (editingVerse) {
                // Update existing verse
                const updateData = {
                    content: verseContent
                };
                
                // Handle images - collect ALL image IDs (existing + new)
                const allImageIds = [];
                
                // Process images
                for (const image of verseImages) {
                    if (image.existing && image.public_id) {
                        // Include existing image IDs
                        allImageIds.push(image.public_id);
                    } else if (image.file) {
                        // Upload new images
                        const formData = new FormData();
                        formData.append('file', image.file);
                        
                        if (image.name) {
                            formData.append('alt_text', image.name);
                        }
                        
                        const imageResponse = await imagesApi.uploadImage(formData);
                        if (imageResponse && imageResponse.public_id) {
                            allImageIds.push(imageResponse.public_id);
                        }
                    }
                }
                
                // Send ALL image IDs (backend will manage moments)
                if (allImageIds.length > 0) {
                    updateData.image_ids = allImageIds;
                }
                
                // Update the verse
                verseResponse = await versesApi.updateVerse(editingVerse.slug, updateData);
            } else {
                // Create new verse
                // First upload all images to get their IDs
                const imageIds = [];
                for (const image of verseImages) {
                    if (image.file) {
                        const formData = new FormData();
                        formData.append('file', image.file);
                        
                        if (image.name) {
                            formData.append('alt_text', image.name);
                        }
                        
                        const imageResponse = await imagesApi.uploadImage(formData);
                        if (imageResponse && imageResponse.public_id) {
                            imageIds.push(imageResponse.public_id);
                        } else {
                            console.error('Invalid image response:', imageResponse);
                            throw new Error('Failed to upload image');
                        }
                    }
                }
                
                // Create the verse with the text content
                const verseData = {
                    story: story.public_id || story.id,
                    content: verseContent,
                    order: (story.verses?.length || 0) + 1,
                    image_ids: imageIds
                };
                
                verseResponse = await versesApi.createVerse(verseData);
                
                // If we have images, create moments for the verse
                if (imageIds.length > 0) {
                    for (let i = 0; i < imageIds.length; i++) {
                        await momentsApi.createMoment({
                            verse: verseResponse.public_id || verseResponse.id,
                            image_id: imageIds[i],
                            order: i + 1
                        });
                    }
                }
            }
            
            // Call the callback to update the story in the parent
            if (onStoryUpdated) {
                await onStoryUpdated();
            }
            
            // Reset form and close modal
            setVerseContent('');
            setVerseImages([]);
            setShowContributeModal(false);
            
            alert(editingVerse ? 'Verse updated successfully!' : 'Verse contributed successfully!');
        } catch (error) {
            console.error('Error submitting verse:', error);
            alert(`Error submitting verse: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!showContributeModal) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[600] flex items-center justify-center">
            <div className="w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative flex flex-col">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
                                <i className="fas fa-book text-cyan-400 text-lg"></i>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                                    {editingVerse ? 'EDIT VERSE' : 'CONTRIBUTE TO STORY'}
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                title="Clear form" 
                                className="w-9 h-9 rounded-lg bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                                onClick={() => {
                                    setVerseContent(''); 
                                    setVerseImages([]);
                                }}
                            >
                                <i className="fas fa-sync-alt text-sm"></i>
                            </button>
                            <button 
                                onClick={() => setShowContributeModal(false)}
                                className="w-9 h-9 rounded-lg bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 p-8 overflow-y-auto flex-grow custom-scrollbar" style={{ minHeight: '0' }}>
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-pen text-purple-400"></i> Verse Content
                                <span className="text-xs text-gray-500 ml-2">(optional)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">You can add images/moments without text — the verse text is optional.</p>
                            <div className="relative">
                                <textarea 
                                    placeholder="Describe your verse..."
                                    value={verseContent}
                                    onChange={(e) => setVerseContent(e.target.value)}
                                    rows={3}
                                    className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none text-lg"
                                ></textarea>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 pointer-events-none transition-opacity duration-300"></div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-images text-purple-400"></i> Verse Moments (Images)
                            </label>
                            
                            {verseImages.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {verseImages.map((image, index) => (
                                        <div key={index} className="relative group">
                                            <Image 
                                                src={image.preview} 
                                                alt={`Verse image ${index + 1}`}
                                                width={400}
                                                height={144}
                                                className="w-full h-36 object-cover rounded-xl border border-gray-700"
                                            />
                                            <button 
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="relative h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            className="hidden" 
                                            multiple 
                                            accept="image/*" 
                                            onChange={handleImageUpload}
                                        />
                                        <div 
                                            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300 cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                                                <i className="fas fa-plus text-purple-400 text-xl"></i>
                                            </div>
                                            <p className="text-gray-300 text-sm">Add more</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/60 transition-all duration-300 cursor-pointer group">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        multiple 
                                        accept="image/*" 
                                        onChange={handleImageUpload}
                                    />
                                    <div 
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300 cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                                            <i className="fas fa-images text-purple-400 text-xl"></i>
                                        </div>
                                        <p className="text-gray-300 text-sm">Add images</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-6" style={{ position: 'sticky', bottom: '0', zIndex: '20' }}>
                    <div className="flex justify-end gap-4">
                        <button 
                            onClick={() => setShowContributeModal(false)}
                            className="px-8 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-2xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-gray-600/50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitContribution}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/30 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner animate-spin"></i>
                                    {editingVerse ? 'Updating...' : 'Submitting...'}
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-rocket text-xl"></i>
                                    {editingVerse ? 'Update Verse' : 'Submit Verse'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContributeModal;