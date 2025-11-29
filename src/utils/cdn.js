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

export default {
  buildImageUrl
};
