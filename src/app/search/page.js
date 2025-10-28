// src/app/search/page.js
'use client';

import { SearchClient } from './SearchClient';

export const metadata = {
  title: 'Search - StoryVermo',
  description: 'Search stories, verses, and users on StoryVermo. Find your next favorite story or creator.',
  robots: 'noindex, follow',
};

export default function SearchPage() {
  return <SearchClient />;
}