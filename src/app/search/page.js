// src/app/search/page.js
import dynamic from 'next/dynamic';

const SearchClient = dynamic(() => import('./SearchClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 flex items-center justify-center">
      <div className="text-white">Loading search...</div>
    </div>
  ),
});

export const metadata = {
  title: 'Search - StoryVermo',
  description: 'Search stories, verses, and users on StoryVermo. Find your next favorite story or creator.',
  robots: 'noindex, follow',
};

export default function SearchPage() {
  return <SearchClient />;
}