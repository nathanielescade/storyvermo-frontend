// src/app/search/page.js
import { SearchClient } from './SearchClient';

// Force dynamic so search queries can be reflected in metadata
export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  // `searchParams` may be a promise-like proxy in Next.js dynamic routes —
  // await it before accessing properties to avoid sync dynamic API errors.
  const params = await searchParams;
  const q = (params?.q || '').toString().trim();
  const hasQuery = q.length > 0;

  const title = hasQuery ? `Search results for "${q}" — StoryVermo` : 'Search — StoryVermo';
  const description = hasQuery
    ? `Search results for "${q}". Find stories, verses, and creators matching ${q} on StoryVermo.`
    : 'Search stories, verses, and users on StoryVermo. Find your next favorite story or creator.';

  const url = hasQuery ? `https://storyvermo.com/search?q=${encodeURIComponent(q)}` : 'https://storyvermo.com/search';

  return {
    title,
    description,
    robots: 'noindex, follow',
    openGraph: {
      title,
      description,
      url,
      siteName: 'StoryVermo',
      type: 'website',
      // Explicitly clear images so parent/site images do not inherit
      images: [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [],
    },
  };
}

export default function SearchPage() {
  return <SearchClient />;
}