import { storiesApi, absoluteUrl } from '../../../../lib/api';

// Enable ISR: revalidate metadata every 10 seconds
export const revalidate = 10;

// Helper to resolve a moment image URL
function resolveMomentImageUrl(moment) {
  if (!moment) return null;
  if (typeof moment === 'string') return absoluteUrl(moment);
  if (moment.image) {
    if (typeof moment.image === 'string') return absoluteUrl(moment.image);
    if (Array.isArray(moment.image) && moment.image.length > 0) {
      const im = moment.image[0];
      if (!im) return null;
      if (typeof im === 'string') return absoluteUrl(im);
      return absoluteUrl(im.file_url || im.url || im);
    }
    if (moment.image.file_url) return absoluteUrl(moment.image.file_url);
    if (moment.image.url) return absoluteUrl(moment.image.url);
    if (moment.image.file) {
      if (typeof moment.image.file === 'string') return absoluteUrl(moment.image.file);
      if (moment.image.file.url) return absoluteUrl(moment.image.file.url);
    }
  }
  if (moment.file_url) return absoluteUrl(moment.file_url);
  if (moment.url) return absoluteUrl(moment.url);
  if (moment.images && Array.isArray(moment.images) && moment.images.length > 0) {
    const im = moment.images[0];
    if (!im) return null;
    if (typeof im === 'string') return absoluteUrl(im);
    return absoluteUrl(im.file_url || im.url || im);
  }
  return null;
}

export async function generateMetadata({ params, searchParams }) {
  try {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
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
      : creatorObj?.name || [creatorObj?.first_name, creatorObj?.last_name].filter(Boolean).join(' ') || creatorObj?.username || null;

    const creatorFirstnameLastname = (() => {
      if (!creatorDisplay) return null;
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
    const readableCreator = creatorFirstnameLastname || creatorDisplay || null;
    const appendedParts = [];
    if (readableCreator) appendedParts.push(readableCreator);
    if (tagsCsv) appendedParts.push(`Tags: ${tagsCsv}`);
    const appendedMeta = appendedParts.join(' | ');
    const fullDescription = baseDescription ? (appendedMeta ? `${baseDescription} - ${appendedMeta}` : baseDescription) : appendedMeta;

    let imageUrl = null;
    if (story.cover_image) {
      if (typeof story.cover_image === 'string') imageUrl = absoluteUrl(story.cover_image);
      else imageUrl = absoluteUrl(story.cover_image.file_url || story.cover_image.url || '');
    }

    // Check for verse-specific metadata request
    const verseParam = resolvedSearchParams?.verse;
    if (verseParam) {
      const verseId = Array.isArray(verseParam) ? verseParam[0] : verseParam;
      const verse = Array.isArray(story.verses)
        ? story.verses.find(v => String(v.id) === String(verseId) || String(v.public_id) === String(verseId) || String(v.slug) === String(verseId))
        : null;

      if (verse) {
        const verseTitleRaw = (verse.title && String(verse.title).trim()) || '';
        const excerpt = verse.content ? String(verse.content).trim().slice(0, 240) : '';
        const verseTitle = verseTitleRaw || (excerpt ? (excerpt.length > 60 ? `${excerpt.slice(0,60).trim()}...` : excerpt) : `Verse ${story.verses.indexOf(verse) + 1}`);

        let verseImage = null;
        if (Array.isArray(verse.moments) && verse.moments.length > 0) {
          verseImage = resolveMomentImageUrl(verse.moments[0]);
        }

        const verseTitle_display = `${story.title} - ${verseTitle}`;
        const verseDescription = excerpt || (creatorDisplay ? `A verse by ${creatorDisplay}` : 'A verse on StoryVermo');

        return {
          title: verseTitle_display,
          description: verseDescription,
          openGraph: {
            title: verseTitle_display,
            description: verseDescription,
            type: 'article',
            images: verseImage ? [{ url: verseImage, alt: verseTitle }] : (imageUrl ? [{ url: imageUrl, alt: story.title || 'Story' }] : undefined),
          },
          twitter: {
            card: 'summary_large_image',
            title: verseTitle_display,
            description: verseDescription,
            images: verseImage ? [verseImage] : (imageUrl ? [imageUrl] : undefined),
          },
        };
      }
    }

    const title = `${story.title} - StoryVermo`;

    return {
      title,
      description: fullDescription || (creatorDisplay ? `A story by ${creatorDisplay}` : 'A story on StoryVermo'),
      openGraph: {
        title,
        description: fullDescription || (creatorDisplay ? `A story by ${creatorDisplay}` : 'A story on StoryVermo'),
        type: 'article',
        publishedTime: story.created_at,
        modifiedTime: story.updated_at,
        authors: creatorDisplay ? [creatorDisplay] : undefined,
        tags: tagList,
        images: imageUrl ? [{ url: imageUrl, alt: story.title || 'Story cover' }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: fullDescription || (creatorDisplay ? `A story by ${creatorDisplay}` : 'A story on StoryVermo'),
        images: imageUrl ? [imageUrl] : undefined,
      },
      keywords: ['story', 'StoryVermo', creatorDisplay, ...tagList].filter(Boolean).join(', ').toLowerCase(),
      author: creatorDisplay || undefined,
      creator: creatorDisplay || undefined,
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
    return {
      title: 'Story Not Found - StoryVermo',
      description: 'The story you\'re looking for doesn\'t exist or might have been deleted.',
    };
  }
}

export default function StoryLayout({ children }) {
  return children;
}
