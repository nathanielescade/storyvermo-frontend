'use client';

import React from 'react';
import FeedClient from '../../FeedClient';

// Generate static params for tag routes to enable Google indexing
export async function generateStaticParams() {
  try {
    console.log('Generating static params for tags...');
    
    // Fetch trending tags from API
    const tags = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tags/trending/?page_size=500`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(r => r.json())
      .catch(err => {
        console.error('Failed to fetch tags for static generation:', err);
        return { results: [] };
      });

    if (!tags || !tags.results) {
      console.warn('No tags returned for static generation');
      return [];
    }

    const params = tags.results
      .filter(t => t && (t.name || t.tag))
      .map(t => ({ tag: encodeURIComponent(String(t.name || t.tag).trim()) }))
      .slice(0, 500);

    console.log(`Generated ${params.length} static tag routes`);
    return params;
  } catch (error) {
    console.error('generateStaticParams error:', error);
    return [];
  }
}

export default function TagPage({ params }) {
  const { tag } = React.use(params);
  const decodedTag = decodeURIComponent(tag);

  return (
    <div className="min-h-screen ">
      {/* Feed */}
      <div className="">
        <FeedClient initialTag={decodedTag} />
      </div>
    </div>
  );
}
