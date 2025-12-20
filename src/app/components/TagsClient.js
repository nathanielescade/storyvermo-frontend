// TagsClient.js - SPA-style tags fetcher
'use client';


import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Head from 'next/head';
import { absoluteUrl } from '../../../lib/api';

export default function TagsClient() {
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [meta, setMeta] = useState({ title: 'Tags — StoryVermo', description: 'Explore tags and discover stories.' });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch tags on mount
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

  // Handle tag selection from URL (SPA style)
  useEffect(() => {
    const tagSlug = searchParams.get('tag');
    if (tagSlug) {
      setSelectedTag(tagSlug);
    } else {
      setSelectedTag(null);
      setStories([]);
      setMeta({ title: 'Tags — StoryVermo', description: 'Explore tags and discover stories.' });
    }
  }, [searchParams]);

  // Fetch stories for selected tag
  useEffect(() => {
    if (!selectedTag) return;
    setStoriesLoading(true);
    setMeta({ title: `${selectedTag} — StoryVermo`, description: `Discover creative stories and verses inspired by ${selectedTag} on StoryVermo.` });
    const fetchStories = async () => {
      try {
        const response = await fetch(absoluteUrl(`/api/tags/${encodeURIComponent(selectedTag)}/stories/`), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const data = await response.json();
        setStories(Array.isArray(data) ? data : (data?.results || []));
      } catch (e) {
        setStories([]);
      } finally {
        setStoriesLoading(false);
      }
    };
    fetchStories();
  }, [selectedTag]);

  // Handle tag click (SPA navigation)
  const handleTagClick = (tag) => {
    router.push(`/tags?tag=${encodeURIComponent(tag.slug || tag.name)}`, { scroll: false, shallow: true });
  };

  return (
    <div>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={`https://storyvermo.com/tags${selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : ''}`} />
      </Head>
      <h2 className="text-xl font-bold mb-4">Tags</h2>
      {loading ? <div>Loading tags...</div> : error ? <div>Error loading tags: {error}</div> : (
        <ul>
          {tags.map(tag => (
            <li key={tag.slug || tag.name}>
              <button onClick={() => handleTagClick(tag)} className={selectedTag === (tag.slug || tag.name) ? 'font-bold underline' : ''}>
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedTag && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Stories for &quot;{selectedTag}&quot;</h3>
          {storiesLoading ? <div>Loading stories...</div> : (
            <ul>
              {stories.length === 0 ? <li>No stories found for this tag.</li> : stories.map(story => (
                <li key={story.slug}>{story.title}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
