// ContributeModal.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Box, TextField, Button, CircularProgress, IconButton } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { X as CloseIcon } from 'lucide-react';
import { buildImageUrl, normalizeUrl, isValidUrl } from '@/utils/cdn';
import { getCsrfToken } from '../../../../lib/utils';
import { versesApi, momentsApi, imagesApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';

const ContributeModal = ({ 
    showContributeModal, 
    setShowContributeModal, 
    story,
    editingVerse,
    onStoryUpdated
}) => {
    const router = useRouter();
    const { currentUser } = useAuth();
    const [verseContent, setVerseContent] = useState('');
    const [localVerseContent, setLocalVerseContent] = useState('');
    const [verseUrl, setVerseUrl] = useState('');
    const [verseCTAText, setVersionCTAText] = useState('');
    const [verseImages, setVerseImages] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletedMoments, setDeletedMoments] = useState([]);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Initialize form when editingVerse changes
    useEffect(() => {
        if (editingVerse) {
            setVerseContent(editingVerse.content || '');
            setLocalVerseContent(editingVerse.content || '');
            setVerseUrl(editingVerse.url || '');
            setVersionCTAText(editingVerse.cta_text || '');
            
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
            setLocalVerseContent('');
            setVerseUrl('');
            setVersionCTAText('');
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

    // Memoized textarea change handler - updates local state immediately
    const handleVerseContentChange = useCallback((e) => {
        const newValue = e.target.value;
        // Update local state immediately (prevents keyboard from closing)
        setLocalVerseContent(newValue);
        // Call parent state update async
        setVerseContent(newValue);
        
        // Auto-expand textarea
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 200); // 200px ≈ 5 lines
            textarea.style.height = newHeight + 'px';
        }
    }, []);

    const handleImageUpload = async (e) => {
        const inputElement = e.target;
        const files = Array.from(inputElement.files);
        if (files.length > 0) {
            const validFiles = [];
            const invalidFiles = [];
            
            for (const file of files) {
                if (file.size > 50 * 1024 * 1024) {
                    invalidFiles.push(`${file.name} is too large (>50MB)`);
                } else if (!file.type.startsWith('image/')) {
                    invalidFiles.push(`${file.name} is not a valid image`);
                } else {
                    validFiles.push(file);
                }
            }
            
            if (invalidFiles.length > 0) {
                alert(`Invalid files: ${invalidFiles.join(', ')}`);
                inputElement.value = '';
                return;
            }

            try {
                const imagePreviews = await Promise.all(
                    validFiles.map(async (file) => {
                        try {
                            const preview = await generatePreview(file);
                            return {
                                file: file,
                                preview: preview,
                                name: file.name,
                                existing: false
                            };
                        } catch (error) {
                            return null;
                        }
                    })
                );
                
                // Filter out any null results from failed processing
                const validPreviews = imagePreviews.filter(preview => preview !== null);
                setVerseImages(prev => [...prev, ...validPreviews]);
                inputElement.value = '';
            } catch (error) {
                alert(`Failed to process images: ${error.message}`);
                inputElement.value = '';
            }
        }
    };

    // Helper function to generate preview
    const generatePreview = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        const imageToRemove = verseImages[index];
        // Track this moment for deletion if it has a moment_id (existing moment)
        if (imageToRemove && imageToRemove.moment_id) {
            setDeletedMoments(prev => [...prev, imageToRemove.moment_id]);
        }
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
                // Delete any moments that were removed
                if (deletedMoments.length > 0) {
                    const momentDeletePromises = deletedMoments.map(momentId => 
                        momentsApi.deleteMoment(momentId).catch(err => {
                        })
                    );
                    await Promise.all(momentDeletePromises);
                }

                // Update existing verse
                const updateData = {
                    content: verseContent
                };
                
                // Add URL and CTA if provided (only for premium users)
                const isPremium = currentUser?.profile?.is_premium || currentUser?.is_premium;
                if (isPremium) {
                    if (verseUrl && isValidUrl(verseUrl)) {
                        updateData.url = normalizeUrl(verseUrl.trim());
                    } else {
                        updateData.url = null;
                    }
                    if (verseCTAText && verseCTAText.trim()) {
                        updateData.cta_text = verseCTAText.trim();
                    } else {
                        updateData.cta_text = null;
                    }
                } else {
                    // If not premium, clear these fields
                    updateData.url = null;
                    updateData.cta_text = null;
                }
                
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
                
                // Add URL and CTA if provided (only for premium users)
                const isPremium = currentUser?.profile?.is_premium || currentUser?.is_premium;
                if (isPremium) {
                    if (verseUrl && isValidUrl(verseUrl)) {
                        verseData.url = normalizeUrl(verseUrl.trim());
                    }
                    if (verseCTAText && verseCTAText.trim()) {
                        verseData.cta_text = verseCTAText.trim();
                    }
                }
                
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
            setDeletedMoments([]);
            setShowContributeModal(false);
            
            // Navigate to the contributed/updated verse
            const verseId = verseResponse.public_id || verseResponse.id;
            const storySlug = story?.slug;
            if (verseId && storySlug) {
                router.push(`/stories/${storySlug}/?verse=${verseId}`);
            }
            
            alert(editingVerse ? 'Verse updated successfully!' : 'Verse contributed successfully!');
        } catch (error) {
            alert(`Error submitting verse: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!showContributeModal) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[10100] flex items-center justify-center p-0">
            <div className="w-full h-full max-w-5xl bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 border border-cyan-500/40 shadow-2xl overflow-visible transform scale-100 transition-all duration-500 relative flex flex-col">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent h-px w-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-6 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
                                <i className="fas fa-book text-cyan-400 text-lg"></i>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                                    {editingVerse ? 'EDIT VERSE' : 'CONTRIBUTE TO STORY'}
                                </h2>
                                {!editingVerse && story && (
                                    <p className="text-sm text-cyan-300/80 line-clamp-2 mt-1">
                                        ✨ Add your verse to <span className="font-semibold text-cyan-300">{
                                            (() => {
                                                // Check if account is brand type and has brand_name
                                                if (story.creator_account_type === 'brand' && story.creator_brand_name) {
                                                    return story.creator_brand_name;
                                                }
                                                // Check if creator object has account_type and brand_name
                                                if (typeof story.creator === 'object' && story.creator) {
                                                    if (story.creator.account_type === 'brand' && story.creator.brand_name) {
                                                        return story.creator_brand_name;
                                                    }
                                                    if (story.creator.first_name) {
                                                        return story.creator.first_name;
                                                    }
                                                    if (story.creator.username) {
                                                        return story.creator.username;
                                                    }
                                                }
                                                // Fallback to first name from top-level
                                                if (story.creator_first_name) {
                                                    return story.creator_first_name;
                                                }
                                                if (story.creator_username) {
                                                    return story.creator_username;
                                                }
                                                return 'user';
                                            })()
                                        }</span>{`'s story`} <span className="font-semibold italic text-purple-300">{`"${story.title}"`}</span>
                                    </p>
                                )}
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
                
                <div className="relative z-10 px-8 py-4 overflow-y-auto grow custom-scrollbar" style={{ minHeight: '0' }}>
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-pen text-purple-400"></i> Verse Content
                                <span className="text-xs text-gray-500 ml-2">(optional)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">You can add images/moments without text — the verse text is optional.</p>
                            <div className="relative">
                                <textarea 
                                    ref={textareaRef}
                                    placeholder="Describe your verse..."
                                    value={localVerseContent}
                                    onChange={handleVerseContentChange}
                                    rows={2}
                                    className="w-full px-5 py-4 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 resize-none text-lg overflow-hidden"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
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
                                        <div key={image.moment_id || image.public_id || image.preview || index} className="relative group">
                                            {/* FIXED: Replaced Next.js Image with regular img tag */}
                                            <img 
                                                src={image.preview} 
                                                alt={`Verse image ${index + 1}`}
                                                className="w-full h-36 object-cover rounded-xl border border-gray-700"
                                            />
                                            <button 
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center text-white text-xs transition-colors"
                                            >
                                                <i className="fas fa-trash"></i>
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
                        
                        {(currentUser?.profile?.is_premium || currentUser?.is_premium) && (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                    <i className="fas fa-link text-purple-400"></i> Verse Link (Optional)
                                </label>
                                <p className="text-xs text-gray-500 mb-2">Add a secure HTTPS link (https://) for this verse (e.g., booking link, product page, etc.)</p>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="https://example.com"
                                        value={verseUrl}
                                        onChange={(e) => setVerseUrl(normalizeUrl(e.target.value))}
                                        className="w-full px-5 py-2 pr-12 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
                                    />
                                    {verseUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setVerseUrl('')}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200 z-10"
                                            title="Clear URL"
                                        >
                                            <i className="fas fa-times text-lg"></i>
                                        </button>
                                    )}
                                </div>
                                {verseUrl && isValidUrl(verseUrl) ? (
                                    <p className="text-green-400 text-xs mt-2">✅ Valid URL</p>
                                ) : verseUrl ? (
                                    <p className="text-red-400 text-xs mt-2">❌ Invalid URL format</p>
                                ) : null}
                            </div>
                        )}
                        
                        {(currentUser?.profile?.is_premium || currentUser?.is_premium) && (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                    <i className="fas fa-mouse-pointer text-purple-400"></i> Button Text (Optional)
                                </label>
                                <p className="text-xs text-gray-500 mb-2">Customize the CTA button text (e.g., "Book Now", "Learn More", "Visit")</p>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="e.g., Book Now, Buy Now, Learn More, Visit"
                                        value={verseCTAText}
                                        onChange={(e) => setVersionCTAText(e.target.value.slice(0, 50))}
                                        className="w-full px-5 py-2 pr-12 bg-slate-900/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300 text-lg"
                                        disabled={!verseUrl || !isValidUrl(verseUrl)}
                                    />
                                    {verseCTAText && (
                                        <button
                                            type="button"
                                            onClick={() => setVersionCTAText('')}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200 z-10"
                                            title="Clear button text"
                                        >
                                            <i className="fas fa-times text-lg"></i>
                                        </button>
                                    )}
                                </div>
                                {verseUrl && !isValidUrl(verseUrl) && (
                                    <p className="text-amber-400 text-xs mt-2">⚠️ Add a valid URL to use CTA text</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">{verseCTAText.length}/50 characters</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-8 py-4" style={{ position: 'sticky', bottom: '0', zIndex: '20' }}>
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