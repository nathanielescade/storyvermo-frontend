// app/stories/[slug]/page.js
import { notFound } from 'next/navigation';
import { storiesApi } from '../../../../lib/api';
import StoryDisplay from './StoryDisplay';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://storyvermo.com';

// ISR: Revalidate every 10 seconds for fresh content
// When user clicks story link, Next.js serves cached page instantly (SPA-like)
// Then revalidates in background, so next visitor gets fresh data
export const revalidate = 10;

// 🔥 CRITICAL FOR SEO: Allow search engine indexing and caching
export async function generateMetadata({ params }) {
  try {
    const { slug } = await params;
    const story = await storiesApi.getStoryBySlug(slug);
    
    if (!story) {
      return {
        title: 'Story Not Found',
      };
    }

    const primaryImage = (() => {
      if (story.cover_image) {
        if (typeof story.cover_image === 'string') return story.cover_image;
        return story.cover_image.file_url || story.cover_image.url || null;
      }
      if (Array.isArray(story.verses) && story.verses.length > 0) {
        const v = story.verses[0];
        if (v) {
          const m = Array.isArray(v.moments) && v.moments.length > 0 ? v.moments[0] : (Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null);
          if (m) {
            if (typeof m === 'string') return m;
            if (m.file_url) return m.file_url;
            if (m.url) return m.url;
            if (m.image && typeof m.image === 'string') return m.image;
          }
        }
      }
      return null;
    })();

    return {
      title: story.title || 'Story',
      description: story.description || 'Read this amazing story on StoryVermo',
      image: primaryImage || undefined,
      openGraph: {
        title: story.title,
        description: story.description,
        image: primaryImage,
        type: 'article',
      },
    };
  } catch (error) {
    return {
      title: 'Story Not Found',
    };
  }
}

// Metadata is now handled in layout.js for faster generation (single API call instead of duplicate)

// Server Component - no 'use client'
export default async function StoryPage({ params }) {
  try {
    const { slug } = await params;
    const story = await storiesApi.getStoryBySlug(slug);
    
    if (!story) {
      notFound();
    }

    // Build JSON-LD Article structured data for crawlers (image-first hints)
    const resolveMomentImageUrl = (moment) => {
      if (!moment) return null;
      if (typeof moment === 'string') return moment;
      if (moment.image) {
        if (typeof moment.image === 'string') return moment.image;
        if (Array.isArray(moment.image) && moment.image.length > 0) {
          const im = moment.image[0];
          if (!im) return null;
          if (typeof im === 'string') return im;
          return im.file_url || im.url || null;
        }
        if (moment.image.file_url) return moment.image.file_url;
        if (moment.image.url) return moment.image.url;
        if (moment.image.file) {
          if (typeof moment.image.file === 'string') return moment.image.file;
          if (moment.image.file.url) return moment.image.file.url;
        }
      }
      if (moment.file_url) return moment.file_url;
      if (moment.url) return moment.url;
      if (moment.images && Array.isArray(moment.images) && moment.images.length > 0) {
        const im = moment.images[0];
        if (!im) return null;
        if (typeof im === 'string') return im;
        return im.file_url || im.url || null;
      }
      return null;
    };

    const primaryImage = (() => {
      if (!story) return null;
      if (story.cover_image) {
        if (typeof story.cover_image === 'string') return story.cover_image;
        return story.cover_image.file_url || story.cover_image.url || null;
      }
      if (Array.isArray(story.verses) && story.verses.length > 0) {
        const v = story.verses[0];
        if (v) {
          const m = Array.isArray(v.moments) && v.moments.length > 0 ? v.moments[0] : (Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null);
          const resolved = resolveMomentImageUrl(m);
          if (resolved) return resolved;
        }
      }
      return null;
    })();

    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${SITE_URL}/stories/${encodeURIComponent(story.slug || slug)}`
      },
      headline: story.title || undefined,
      image: primaryImage ? { 
        "@type": "ImageObject",
        url: primaryImage,
        width: (story.cover_image && (story.cover_image.width || story.cover_image.w)) || 1200,
        height: (story.cover_image && (story.cover_image.height || story.cover_image.h)) || 630,
      } : undefined,
      datePublished: story.created_at || undefined,
      dateModified: story.updated_at || undefined,
      author: story.creator ? (typeof story.creator === 'string' ? { "@type": "Person", name: story.creator } : { "@type": "Person", name: story.creator.name || story.creator.username || story.creator.public_id || '' }) : undefined,
      publisher: { 
        "@type": "Organization", 
        name: 'StoryVermo',
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
          width: 512,
          height: 512
        }
      },
      description: story.description || undefined,
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        <StoryDisplay initialStory={story} slug={slug} />
      </>
    );
  } catch (error) {
    notFound();
  }
}