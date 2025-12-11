/**
 * useImageCompressionUploader Hook
 * Handles image compression, preview generation, and optimized uploading
 */

import { useState, useCallback } from 'react';
import { compressAndCreateFile, getFileSizeKB, getCompressionRatio } from '../lib/compressImage';

export function useImageCompressionUploader() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Generate a preview image URL from compressed file
   * @param {File} file
   * @returns {Promise<string>} Data URL preview
   */
  const generatePreview = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to generate preview'));
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Process and compress a single image file
   * @param {File} file - The image file to compress
   * @param {Object} options - Compression options
   * @returns {Promise<{file: File, preview: string, originalSize: number, compressedSize: number, ratio: string}>}
   */
  const compressImageFile = useCallback(async (file, options = {}) => {
    const defaultOptions = {
      maxWidth: 1080,
      quality: 0.88,  // High quality for better cover images
      format: 'image/jpeg',
      noiseReduction: false,  // Disable noise reduction by default
      ...options
    };

    try {
      setIsCompressing(true);
      setError(null);

      // Record original size
      const originalSize = file.size;

      // Compress the image
      const compressedFile = await compressAndCreateFile(file, defaultOptions);
      const compressedSize = compressedFile.size;

      // Generate preview (data URL)
      const preview = await generatePreview(compressedFile);

      // Calculate compression stats
      const ratio = getCompressionRatio(originalSize, compressedSize);
      const stats = {
        originalSize: getFileSizeKB(originalSize),
        compressedSize: getFileSizeKB(compressedSize),
        ratio,
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize
      };

      setCompressionStats(stats);

      return {
        file: compressedFile,
        preview,
        ...stats
      };
    } catch (err) {
      const errorMsg = `Compression failed: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsCompressing(false);
    }
  }, [generatePreview]);

  /**
   * Process multiple image files
   * @param {File[]} files - Array of image files
   * @param {Object} options - Compression options
   * @returns {Promise<Array>} Array of compressed file objects
   */
  const compressMultipleImages = useCallback(async (files, options = {}) => {
    if (!Array.isArray(files)) {
      throw new Error('Input must be an array of files');
    }

    try {
      setIsCompressing(true);
      setError(null);

      const results = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`Invalid file type: ${file.name}. Only images are supported.`);
        }

        const result = await compressImageFile(file, options);
        results.push(result);
      }

      return results;
    } catch (err) {
      const errorMsg = `Batch compression failed: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsCompressing(false);
    }
  }, [compressImageFile]);

  /**
   * Process file input and prepare for upload
   * @param {Event|File[]} input - File input event or array of files
   * @param {Object} options - Compression options
   * @returns {Promise<Array>} Array of processed files with previews
   */
  const processFilesForUpload = useCallback(async (input, options = {}) => {
    try {
      setIsCompressing(true);
      setError(null);

      let files = [];

      if (input instanceof Event) {
        files = Array.from(input.target.files || []);
      } else if (Array.isArray(input)) {
        files = input;
      } else if (input instanceof File) {
        files = [input];
      } else {
        throw new Error('Invalid input type');
      }

      if (files.length === 0) {
        throw new Error('No files selected');
      }

      // Validate all files are images
      const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        throw new Error(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
      }

      // Compress all files
      const processedFiles = await Promise.all(
        files.map(file => compressImageFile(file, options))
      );

      return processedFiles;
    } catch (err) {
      const errorMsg = `File processing failed: ${err.message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsCompressing(false);
    }
  }, [compressImageFile]);

  /**
   * Clear compression stats and error
   */
  const clearStats = useCallback(() => {
    setCompressionStats(null);
    setError(null);
  }, []);

  return {
    compressImageFile,
    compressMultipleImages,
    processFilesForUpload,
    generatePreview,
    clearStats,
    isCompressing,
    compressionStats,
    error
  };
}
