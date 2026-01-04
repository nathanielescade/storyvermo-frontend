export const metadata = {
  title: 'StoryVermo - Every moment has a story',
  description: 'Every moment has a story. Write, snap, and create with others on StoryVermo.',
  openGraph: {
    title: 'StoryVermo - Every moment has a story',
    description: 'Every moment has a story. Write, snap, and create with others on StoryVermo.',
    siteName: 'StoryVermo',
    url: 'https://storyvermo.com',
    images: [
      {
        url: 'https://storyvermo.com/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'StoryVermo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StoryVermo - Every moment has a story',
    description: 'Every moment has a story. Write, snap, and create with others on StoryVermo.',
    images: ['https://storyvermo.com/android-chrome-512x512.png'],
  },
};

import FeedClient from './FeedClient';
import { storiesApi } from '../../lib/api';

// Server-side utility to strip verse images
const stripVerseImages = (stories) => {
  if (!Array.isArray(stories)) {
    return stripVerseImagesFromStory(stories);
  }
  return stories.map(story => stripVerseImagesFromStory(story));
};

const stripVerseImagesFromStory = (story) => {
  if (!story) return story;
  if (Array.isArray(story.verses)) {
    return {
      ...story,
      verses: story.verses.map(verse => {
        const { images, ...verseWithoutImages } = verse;
        return verseWithoutImages;
      })
    };
  }
  return story;
};

export default async function Home({ initialTag = 'for-you' }) {
  // Server-side fetch initial page using cursor-based pagination
  let initial = null;
  try {
    const params = { 
      cursor: null,
      // Increased from 8 to 12 for better LCP - ensures first story loads in viewport
      limit: 12,
      tag: initialTag || 'for-you' 
    };
    initial = await storiesApi.getPaginatedStories(params);
  } catch (e) {
    // Return empty initial state instead of null
    initial = { results: [], next_cursor: null, has_more: false, count: 0, page_size: 20 };
  }

  let stories = initial?.results || (Array.isArray(initial) ? initial : []);
  
  // (Removed N+1 hydration: only use paginated stories)
  
  // 🎯 OPTIMIZATION: Strip verse images to reduce payload and improve performance
  // Images will be lazy-loaded when user opens VerseViewer
  stories = stripVerseImages(stories);
  
  // Pass initial state to FeedClient to avoid skeleton loader on first visit
  return <FeedClient initialStories={stories} initialNextCursor={initial?.next_cursor} initialTag={initialTag} />;
}