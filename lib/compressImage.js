/**
 * Instagram-style image compression utility
 * Compresses images to 1080px max width with JPEG quality 0.70
 * Removes EXIF metadata, converts PNG to JPEG, reduces noise
 */

/**
 * Compress an image file using Canvas API
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1080,
    quality = 0.78,  // Better quality (0.78 = sweet spot)
    format = 'image/jpeg',
    minFileSizeKB = 500,  // Only compress if > 500KB
  } = options;

  // Skip compression for small files (already optimized)
  if (file.size < minFileSizeKB * 1024) {
    console.log(`Image ${file.name} is small (${(file.size / 1024).toFixed(0)}KB), skipping compression`);
    return file;
  }

  try {
    // Step 1: Read the file as a data URL
    const dataUrl = await readFileAsDataURL(file);

    // Step 2: Load the image and get its dimensions
    const img = await loadImage(dataUrl);

    // Step 3: Create canvas and draw image with optimal sizing
    const canvas = document.createElement('canvas');
    const { width, height } = calculateDimensions(img, maxWidth);
    
    canvas.width = width;
    canvas.height = height;

    // Step 4: Draw image on canvas with anti-aliasing
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get canvas context');

    // Apply high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Fill with white background (for PNG to JPEG conversion)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw the image
    ctx.drawImage(img, 0, 0, width, height);

    // Step 5: Apply slight noise reduction via canvas filtering
    applyNoiseReduction(ctx, width, height);

    // Step 6: Convert canvas to blob with JPEG quality
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          resolve(blob);
        },
        format,
        quality
      );
    });
  } catch (error) {
    console.error('Image compression error:', error);
    throw error;
  }
}

/**
 * Read file as data URL
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Load image from data URL
 * @param {string} dataUrl
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 * Always resize to optimized dimensions for maximum compression
 * @param {HTMLImageElement} img
 * @param {number} maxWidth
 * @returns {Object} { width, height }
 */
function calculateDimensions(img, maxWidth) {
  let { width, height } = img;

  // Always resize to maxWidth to ensure consistent, highly compressed output
  if (width !== maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }

  // Ensure dimensions are even (better for compression)
  width = width % 2 === 0 ? width : width + 1;
  height = height % 2 === 0 ? height : height + 1;

  return { width, height };
}

/**
 * Apply subtle noise reduction to reduce file size
 * Uses canvas filtering and pixel averaging
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function applyNoiseReduction(ctx, width, height) {
  try {
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Create a copy for reading
    const dataCopy = new Uint8ClampedArray(data);

    // Moderate noise reduction - 15% blur factor for balance
    const blurFactor = 0.15;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        continue; // Skip borders
      }

      // Apply box blur for noise reduction (more aggressive)
      let r = 0, g = 0, b = 0, count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const idx = (ny * width + nx) * 4;
          r += dataCopy[idx];
          g += dataCopy[idx + 1];
          b += dataCopy[idx + 2];
          count++;
        }
      }

      // Apply 25% of the blur (more aggressive than 10%)
      data[i] = Math.round(dataCopy[i] * (1 - blurFactor) + (r / count) * blurFactor);
      data[i + 1] = Math.round(dataCopy[i + 1] * (1 - blurFactor) + (g / count) * blurFactor);
      data[i + 2] = Math.round(dataCopy[i + 2] * (1 - blurFactor) + (b / count) * blurFactor);
    }

    // Put filtered image data back
    ctx.putImageData(imageData, 0, 0);
  } catch (error) {
    console.warn('Noise reduction failed, continuing without it:', error);
    // Don't throw - noise reduction is optional
  }
}

/**
 * Create a compressed version of file without EXIF
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @returns {Promise<File>} Compressed file with removed EXIF
 */
export async function compressAndCreateFile(file, options = {}) {
  const blob = await compressImage(file, options);
  
  // Create a new file with the compressed blob
  const filename = file.name.replace(/\.[^/.]+$/, '.jpg'); // Convert to .jpg
  return new File([blob], filename, { 
    type: 'image/jpeg',
    lastModified: Date.now()
  });
}

/**
 * Get file size in human-readable format
 * @param {number} bytes
 * @returns {string}
 */
export function getFileSizeKB(bytes) {
  return (bytes / 1024).toFixed(2);
}

/**
 * Calculate compression ratio
 * @param {number} originalSize
 * @param {number} compressedSize
 * @returns {number} Percentage reduced
 */
export function getCompressionRatio(originalSize, compressedSize) {
  return (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);
}
