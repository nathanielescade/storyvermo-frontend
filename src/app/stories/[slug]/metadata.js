// app/stories/[slug]/metadata.js
import { storiesApi, absoluteUrl } from '../../../../lib/api';

export async function generateMetadata({ params }) {
  try {
    const { slug } = await params;
    const story = await storiesApi.getStoryBySlug(slug);

    if (!story) {
      return {
        title: 'Story Not Found - StoryVermo',
        description: 'The story you\'re looking for doesn\'t exist or might have been deleted.',
      };
    }

    const creatorObj = story.creator;
    const creatorDisplay = typeof creatorObj === 'string'
      ? creatorObj
      : creatorObj?.name || [creatorObj?.first_name, creatorObj?.last_name].filter(Boolean).join(' ') || creatorObj?.username || 'Unknown Creator';

    const creatorFirstnameLastname = (() => {
      if (typeof creatorObj === 'object' && (creatorObj.first_name || creatorObj.last_name)) {
        return [creatorObj.first_name, creatorObj.last_name].filter(Boolean).join(' ');
      }
      if (typeof creatorDisplay === 'string' && creatorDisplay.includes(' ')) return creatorDisplay;
      return creatorDisplay;
    })();

    const tagList = Array.isArray(story.tags)
      ? story.tags.map(tag => (typeof tag === 'string' ? tag : tag.name || tag.slug || String(tag))).filter(Boolean)
      : [];

    const tagsCsv = tagList.join(', ');
    const baseDescription = story.description ? String(story.description).trim() : '';
    const appendedMeta = `${creatorFirstnameLastname}${tagsCsv ? ` | Tags: ${tagsCsv}` : ''}`;
    const fullDescription = baseDescription ? `${baseDescription} - ${appendedMeta}` : appendedMeta;

    let imageUrl = null;
    if (story.cover_image) {
      if (typeof story.cover_image === 'string') imageUrl = absoluteUrl(story.cover_image);
      else imageUrl = absoluteUrl(story.cover_image.file_url || story.cover_image.url || '');
    }

    const title = `${story.title} - StoryVermo`;

    return {
      title,
      description: fullDescription || `A story by ${creatorDisplay}`,
      openGraph: {
        title,
        description: fullDescription || `A story by ${creatorDisplay}`,
        type: 'article',
        publishedTime: story.created_at,
        modifiedTime: story.updated_at,
        authors: [creatorDisplay],
        tags: tagList,
        images: imageUrl ? [{ url: imageUrl, alt: story.title || 'Story cover' }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: fullDescription || `A story by ${creatorDisplay}`,
        images: imageUrl ? [imageUrl] : undefined,
      },
      keywords: ['story', 'StoryVermo', creatorDisplay, ...tagList].filter(Boolean).join(', ').toLowerCase(),
      author: creatorDisplay,
      creator: creatorDisplay,
      publisher: 'StoryVermo',
      robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
        },
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Story Not Found - StoryVermo',
      description: 'The story you\'re looking for doesn\'t exist or might have been deleted.',
    };
  }
}