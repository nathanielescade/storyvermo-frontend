// src/app/tags/[tag]/page.js
import FeedClient from '../../FeedClient';
import { absoluteUrl, siteUrl, storiesApi } from '../../../../lib/api';

// Provide SEO metadata for the /tags/[tag] page so crawlers see useful content.
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const tagSlug = resolvedParams.tag || '';
  // Normalize a readable tag name from slug
  const prettyTag = (() => {
    try {
      return decodeURIComponent(tagSlug).replace(/[-_]+/g, ' ');
    } catch (e) {
      return tagSlug.replace(/[-_]+/g, ' ');
    }
  })();

  // Default metadata derived from the slug. We avoid relying on backend API
  // to ensure metadata is always present for crawlers and social previews.
  const title = `${prettyTag ? prettyTag.charAt(0).toUpperCase() + prettyTag.slice(1) : 'Tags'} — StoryVermo`;
const description = `Discover creative stories and verses inspired by ${prettyTag} on StoryVermo.`;

  const url = siteUrl(`/tags/${encodeURIComponent(tagSlug)}/`);

  // Try to enrich metadata from the API but fall back to defaults on any error.
  try {
  const response = await fetch(absoluteUrl(`/api/tags/${encodeURIComponent(tagSlug)}/seo/`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      const seo = await response.json();
      const apiTagName = seo?.tag?.name;
      const apiDescription = seo?.tag?.description;
      if (apiTagName) {
        // prefer API-provided name/description when available
        const aTitle = `${apiTagName} — StoryVermo`;
        const aDesc = apiDescription || description;
        return {
          title: aTitle,
          description: aDesc,
          openGraph: {
            title: aTitle,
            description: aDesc,
            url,
            siteName: 'StoryVermo',
          },
          twitter: {
            card: 'summary_large_image',
            title: aTitle,
            description: aDesc,
          },
          alternates: { canonical: url }
        };
      }
    }
  } catch (e) {
    // ignore and fall back to defaults below
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'StoryVermo',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: url }
  };
}

// Only render the interactive feed on this route. Metadata above provides
// SEO content for crawlers; we avoid adding any server-side visible text here.
export default async function TagPage({ params }) {
  const resolvedParams = await params;
  const tagSlug = resolvedParams.tag || '';
  // Normalize tag name from slug
  const tag = (() => {
    try {
      return decodeURIComponent(tagSlug);
    } catch (e) {
      return tagSlug;
    }
  })();

  // Server-side fetch initial page using cursor-based pagination
  let initial = null;
  try {
    const params = { 
      cursor: null,
      // Increased from 3 to 8 for better initial tag page load experience
      limit: 8,
      tag: tag  // Pass decoded tag directly to API
    };
    initial = await storiesApi.getPaginatedStories(params);
    console.log(`[TagPage] Fetched stories for tag "${tag}":`, initial?.results?.length || 0, 'stories');
  } catch (e) {
    console.error(`[TagPage] Error fetching stories for tag "${tag}":`, e);
    // Return empty initial state instead of null
    initial = { results: [], next_cursor: null, has_more: false, count: 0, page_size: 20 };
  }

  let stories = initial?.results || (Array.isArray(initial) ? initial : []);
  
  // 🚀 CRITICAL: Enrich lightweight paginated stories with full data (tags, verses_count, etc)
  // This ensures instant display just like /stories/[slug] pages
  try {
    stories = await Promise.all(
      stories.map(async (story) => {
        try {
          // Fetch full story data in parallel for instant rendering
          const fullStory = await storiesApi.getStoryBySlug(story.slug);
          return fullStory;
        } catch (error) {
          // If fetch fails, return the lightweight story we have
          return story;
        }
      })
    );
  } catch (e) {
    // If Promise.all fails, just use lightweight stories
  }
  
  const nextCursor = initial?.next_cursor || null;
  // hasMore should be true if next_cursor exists, otherwise check the has_more flag
  const hasMore = !!(initial?.next_cursor) || initial?.has_more === true;
  const initialState = {
    stories,
    nextCursor,
    hasMore,
    currentTag: tag,
  };
  
  console.log(`[TagPage] Passing initialState with ${stories.length} stories for tag "${tag}"`, { hasMore, nextCursor });

  return <FeedClient initialState={initialState} />;
}