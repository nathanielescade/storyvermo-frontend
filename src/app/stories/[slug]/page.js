// app/stories/[slug]/page.js
import { notFound } from 'next/navigation';
import { storiesApi } from '../../../../lib/api';
import StoryDisplay from './StoryDisplay';
import { generateMetadata } from './metadata';

// Export metadata function
export { generateMetadata };

// Server Component - no 'use client'
export default async function StoryPage({ params }) {
  try {
    const { slug } = await params;
    const story = await storiesApi.getStoryBySlug(slug);
    
    if (!story) {
      notFound();
    }

    console.debug('[StoryPage] fetched story payload', { 
      slug, 
      hasData: !!story, 
      keys: story ? Object.keys(story) : null 
    });

    return <StoryDisplay initialStory={story} slug={slug} />;
  } catch (error) {
    console.error('Error fetching story:', error);
    notFound();
  }
}