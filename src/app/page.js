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

export default async function Home({ initialTag = 'for-you' }) {
  // Server-side fetch initial page (cached via next/cache)
  let initial = null;
  try {
    // Use the initialTag passed from tag routes (e.g. /tags/:tag) or fall back
    // to the default 'for-you' feed when not provided.
    const params = { page: 1, tag: initialTag || 'for-you' };
    initial = await storiesApi.getPaginatedStories(params);
  } catch (e) {
    console.error('Server fetch for initial stories failed:', e);
    // Return empty initial state instead of null
    initial = { results: [], next: null };
  }

  const stories = initial?.results || (Array.isArray(initial) ? initial : []);
  const hasNext = initial?.next !== undefined ? (initial.next !== null) : false;

  const initialState = {
    stories,
    page: 1,
    hasNext,
    currentTag: initialTag
  };

  return <FeedClient initialState={initialState} />;
}