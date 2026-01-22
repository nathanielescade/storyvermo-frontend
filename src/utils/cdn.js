// Minimal CDN helper used by VerseViewer and other client components
// Exports buildImageUrl(url, opts) which returns a URL with common image params appended

export function buildImageUrl(imageUrl, opts = {}) {
  if (!imageUrl) return imageUrl;

  try {
    // Support relative URLs by using origin if running in browser
    const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost';
    const u = new URL(imageUrl, base);

    const { w, fmt, q } = opts;
    if (w) u.searchParams.set('w', String(w));
    if (fmt) u.searchParams.set('fmt', String(fmt));
    if (q) u.searchParams.set('q', String(q));

    return u.toString();
  } catch (err) {
    // If URL parsing fails, return original
    return imageUrl;
  }
}

/**
 * Normalize URL to ensure it has a protocol
 * Accepts: https://example.com, http://example.com, www.example.com, example.com
 * Returns: URL with https:// prepended if needed
 */
export function normalizeUrl(url) {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  // Already has a protocol
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  
  // Starts with www
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  
  // No protocol, assume https
  return `https://${trimmed}`;
}

/**
 * Check if a URL is valid (has protocol after normalization)
 */
export function isValidUrl(url) {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  return normalized.startsWith('https://') || normalized.startsWith('http://');
}

export default {
  buildImageUrl,
  normalizeUrl,
  isValidUrl
};
