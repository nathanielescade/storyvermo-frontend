import FeedClient from './FeedClient';
import { getPaginatedStories } from '../../lib/api.server';

export default async function Home() {
  // Server-side fetch initial page (cached via next/cache)
  let initial = null;
  try {
    initial = await getPaginatedStories({ page: 1 });
  } catch (e) {
    console.error('Server fetch for initial stories failed:', e);
    initial = null;
  }

  const stories = initial?.results || (Array.isArray(initial) ? initial : []);
  const hasNext = initial?.next !== undefined ? (initial.next !== null) : false;

  const initialState = {
    stories,
    page: 1,
    hasNext,
    currentTag: 'for-you'
  };

  return <FeedClient initialState={initialState} />;
}