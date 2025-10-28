// src/app/search/page.js
import { SearchClient } from './SearchClient';

export const metadata = {
  title: 'Search - StoryVermo',
  description: 'Search stories, verses, and users on StoryVermo. Find your next favorite story or creator.',
  robots: 'noindex, follow',
};

// Add this to prevent static generation
export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return <SearchClient />;
}