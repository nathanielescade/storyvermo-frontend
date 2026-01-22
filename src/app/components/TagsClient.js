// TagsClient.js - SPA-style tags fetcher
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { absoluteUrl } from '../../../lib/api';

export default function TagsClient() {
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(absoluteUrl('/api/tags/'), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        let data = await response.json();
        let fetchedTags = Array.isArray(data) ? data : (data?.results || []);
        if (!Array.isArray(fetchedTags) || fetchedTags.length === 0) {
          const trendingResponse = await fetch(absoluteUrl('/api/tags/trending/'), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          const trendingData = await trendingResponse.json();
          fetchedTags = Array.isArray(trendingData) ? trendingData : (trendingData?.results || []);
        }
        setTags(fetchedTags);
      } catch (e) {
        setError(e.message);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  if (loading) return <div>Loading tags...</div>;
  if (error) return <div>Error loading tags: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Tags</h2>
      <ul>
        {tags.map(tag => (
          <li key={tag.slug || tag.name}>
            <Link href={`/tags/${tag.slug || tag.name}`}>{tag.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
