// src/app/tags/[tag]/page.js
import FeedClient from '../../FeedClient';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const tagSlug = resolvedParams.tag || '';
  const prettyTag = (() => {
    try {
      return decodeURIComponent(tagSlug).replace(/[-_]+/g, ' ');
    } catch (e) {
      return tagSlug.replace(/[-_]+/g, ' ');
    }
  })();

  const title = `${prettyTag ? prettyTag.charAt(0).toUpperCase() + prettyTag.slice(1) : 'Tags'} — StoryVermo`;
  const description = `Discover creative stories and verses inspired by ${prettyTag} on StoryVermo.`;

  return {
    title,
    description,
  };
}

export default async function TagPage({ params }) {
  const resolvedParams = await params;
  const tagSlug = resolvedParams.tag || '';
  const tag = (() => {
    try {
      return decodeURIComponent(tagSlug);
    } catch (e) {
      return tagSlug;
    }
  })();

  return <FeedClient />;
}