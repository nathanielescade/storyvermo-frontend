import React, { useRef } from 'react';

const ImageUploadArea = ({ imagePreview, title, setImageFile, setImagePreview, setError }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const inputElement = e.target;
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        // Reset input so user can try again
        inputElement.value = '';
        return;
      }
      
      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('Image file must be less than 50MB');
        // Reset input so user can try again
        inputElement.value = '';
        return;
      }
      
      try {
        setError(null);

        // Create a preview URL for the image
        const preview = URL.createObjectURL(file);
        setImagePreview(preview);
        setImageFile(file);
        
        // Reset input after processing
        inputElement.value = '';
      } catch (err) {
        setError(`Failed to process image: ${err.message}`);
        // Reset input on error too
        inputElement.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeImage = () => {
    try {
      if (imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    } catch (e) {}
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
        <span className="fas fa-image text-cyan-400"></span> Cover Image
      </label>
      <div className="relative w-full h-72 rounded-2xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-cyan-500/60 transition-all duration-300 cursor-pointer group" onClick={triggerFileInput}>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
        />
        {imagePreview ? (
          <>
            <div className="relative w-full h-full">
              <img 
                src={imagePreview} 
                alt={title ? `${title} - Cover image` : 'Cover image'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '';
                  e.target.alt = "Image preview failed to load";
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6 gap-4">
              <button 
                type="button"
                className="px-5 py-2.5 bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-400 rounded-xl font-medium transition-all duration-300 border border-cyan-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileInput();
                }}
              >
                <span className="fas fa-sync-alt mr-2"></span> Change
              </button>
              <button 
                type="button"
                className="px-5 py-2.5 bg-red-500/30 hover:bg-red-500/40 text-red-400 rounded-xl font-medium transition-all duration-300 border border-red-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage();
                }}
              >
                <span className="fas fa-trash mr-2"></span> Remove
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/70 to-indigo-900/70 group-hover:from-slate-900/90 group-hover:to-indigo-900/90 transition-all duration-300">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border border-cyan-500/30">
              <span className="fas fa-cloud-upload-alt text-cyan-400 text-3xl"></span>
            </div>
            <p className="text-gray-300 font-medium text-lg">Click to upload cover image</p>
            <p className="text-gray-500 text-sm mt-2">JPG, PNG, GIF up to 50MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

ImageUploadArea.displayName = 'ImageUploadArea';

export default ImageUploadArea;