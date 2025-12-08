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
  // Server-side fetch initial page using cursor-based pagination
  let initial = null;
  try {
    const params = { 
      cursor: null,
      limit: 5,
      tag: initialTag || 'for-you' 
    };
    initial = await storiesApi.getPaginatedStories(params);
  } catch (e) {
    // Return empty initial state instead of null
    initial = { results: [], next_cursor: null, has_more: false, count: 0, page_size: 20 };
  }

  const stories = initial?.results || (Array.isArray(initial) ? initial : []);
  const nextCursor = initial?.next_cursor || null;
  // hasMore should be true if next_cursor exists, otherwise check the has_more flag
  const hasMore = !!(initial?.next_cursor) || initial?.has_more === true;

  const initialState = {
    stories,
    nextCursor,
    hasMore,
    currentTag: initialTag,
    totalCount: initial?.count || 0
  };

  return <FeedClient initialState={initialState} />;
}