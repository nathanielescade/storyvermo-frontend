// app/tags/[tag]/metadata.js
import { tagsApi, siteUrl } from '../../../../lib/api';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    // Fetch tag data to get story count
    const tagData = await tagsApi.getPopular().catch(() => []);
    const tagInfo = Array.isArray(tagData) 
      ? tagData.find(t => 
          (t.slug && t.slug.toLowerCase() === decodedTag.toLowerCase()) ||
          (t.name && t.name.toLowerCase() === decodedTag.toLowerCase())
        )
      : null;

    const storyCount = tagInfo?.story_count || 0;
    const tagDisplay = decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1);
    
    const title = `${tagDisplay} - Stories & Verses | StoryVermo`;
    const description = `Discover ${storyCount > 0 ? storyCount : 'amazing'} stories and verses tagged with "${tagDisplay}" on StoryVermo. Explore creative content from our community.`;

    return {
      title: title,
      description: description.slice(0, 160),
      keywords: `${decodedTag}, stories, verses, ${decodedTag} stories, creative writing`,
      openGraph: {
        title: title,
        description: description.slice(0, 160),
        type: 'website',
        url: `${siteUrl}/tags/${encodeURIComponent(decodedTag)}`,
      },
      twitter: {
        card: 'summary',
        title: title,
        description: description.slice(0, 160),
      },
      canonical: `${siteUrl}/tags/${encodeURIComponent(decodedTag)}`,
    };
  } catch (error) {
    console.error('Error generating tag metadata:', error);
    return {
      title: 'Tags - StoryVermo',
      description: 'Explore stories and verses by tags on StoryVermo',
    };
  }
}
