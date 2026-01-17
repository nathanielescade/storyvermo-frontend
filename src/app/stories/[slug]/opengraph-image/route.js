// app/stories/[slug]/opengraph-image/route.js
import { storiesApi, absoluteUrl, isValidUrl } from '../../../../../lib/api';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache for 1 hour

// Helper to resolve a moment image URL
function resolveMomentImageUrl(moment) {
  if (!moment) return null;
  let resolvedUrl = null;
  
  if (typeof moment === 'string') {
    resolvedUrl = moment;
  } else if (moment.image) {
    if (typeof moment.image === 'string') resolvedUrl = moment.image;
    else if (Array.isArray(moment.image) && moment.image.length > 0) {
      const im = moment.image[0];
      if (typeof im === 'string') resolvedUrl = im;
      else resolvedUrl = im?.file_url || im?.url;
    } else {
      resolvedUrl = moment.image?.file_url || moment.image?.url;
      if (!resolvedUrl && moment.image?.file) {
        resolvedUrl = typeof moment.image.file === 'string' ? moment.image.file : moment.image.file?.url;
      }
    }
  } else if (moment.file_url) {
    resolvedUrl = moment.file_url;
  } else if (moment.url) {
    resolvedUrl = moment.url;
  } else if (moment.images && Array.isArray(moment.images) && moment.images.length > 0) {
    const im = moment.images[0];
    if (typeof im === 'string') resolvedUrl = im;
    else resolvedUrl = im?.file_url || im?.url;
  }
  
  if (isValidUrl(resolvedUrl)) {
    return absoluteUrl(resolvedUrl);
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    
    const story = await storiesApi.getStoryBySlug(slug);
    if (!story) {
      return new Response('Story not found', { status: 404 });
    }

    // Get primary image
    let imageUrl = null;
    if (story.cover_image) {
      if (typeof story.cover_image === 'string') {
        if (isValidUrl(story.cover_image)) imageUrl = absoluteUrl(story.cover_image);
      } else {
        const coverUrl = story.cover_image.file_url || story.cover_image.url;
        if (isValidUrl(coverUrl)) imageUrl = absoluteUrl(coverUrl);
      }
    }
    
    // Fallback to first verse image
    if (!imageUrl && Array.isArray(story.verses) && story.verses.length > 0) {
      for (const verse of story.verses) {
        if (verse && Array.isArray(verse.moments) && verse.moments.length > 0) {
          const momentImage = resolveMomentImageUrl(verse.moments[0]);
          if (momentImage) {
            imageUrl = momentImage;
            break;
          }
        }
      }
    }

    // If we have an image URL, redirect to it instead of trying to generate
    if (imageUrl) {
      return new Response(null, {
        status: 307,
        headers: {
          Location: imageUrl,
        },
      });
    }

    // Fallback: return a simple placeholder response
    return new Response('No image available', { status: 404 });
  } catch (error) {
    console.error('Error in OG image route:', error);
    return new Response('Error generating OG image', { status: 500 });
  }
}
