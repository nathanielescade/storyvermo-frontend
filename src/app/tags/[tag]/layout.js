import React from 'react';

export async function generateMetadata({ params }) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  return {
    title: `#${decodedTag} Stories | StoryVermo`,
    description: `Explore all stories tagged with #${decodedTag} on StoryVermo. Discover creative content and stories in this category.`,
    openGraph: {
      title: `#${decodedTag} Stories | StoryVermo`,
      description: `Explore all stories tagged with #${decodedTag} on StoryVermo. Discover creative content and stories in this category.`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `#${decodedTag} Stories | StoryVermo`,
      description: `Explore all stories tagged with #${decodedTag} on StoryVermo. Discover creative content and stories in this category.`,
    },
  };
}

export default function TagDetailLayout({ children }) {
  return children;
}
