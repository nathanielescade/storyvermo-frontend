// src/app/search/page.js
import { SearchClient } from './SearchClient';

export const metadata = {
  title: 'Search - StoryVermo',
  description: 'Search stories, verses, and users on StoryVermo. Find your next favorite story or creator.',
  robots: 'noindex, follow',
};

// Make the page server-side rendered but with no actual search results during build
export default function SearchPage() {
  return <SearchClient />;
}