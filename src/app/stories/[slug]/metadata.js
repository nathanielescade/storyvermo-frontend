// app/stories/[slug]/metadata.js
import { storiesApi, absoluteUrl, siteUrl } from '../../../../lib/api';

// Enable ISR: revalidate metadata every 10 seconds
export const revalidate = 10;

// Helper to validate URL is not empty
function isValidUrl(url) {
  return url && typeof url === 'string' && url.trim().length > 0 && (url.startsWith('http') || url.startsWith('/'));
}

// Helper to resolve a moment image URL on the server side (handles common shapes)
function resolveMomentImageUrl(moment) {
  if (!moment) return null;
  let resolvedUrl = null;
  
  if (typeof moment === 'string') {
    resolvedUrl = moment;
  } else if (moment.image) {
    if (typeof moment.image === 'string') resolvedUrl = moment.image;
    else if (Array.isArray(moment.image) && moment.image.length > 0) {
      const im = moment.image[0];
      if (typeof im === 'string') resolvedUrl = im;
      else resolvedUrl = im?.file_url || im?.url;
    } else {
      resolvedUrl = moment.image?.file_url || moment.image?.url;
      if (!resolvedUrl && moment.image?.file) {
        resolvedUrl = typeof moment.image.file === 'string' ? moment.image.file : moment.image.file?.url;
      }
    }
  } else if (moment.file_url) {
    resolvedUrl = moment.file_url;
  } else if (moment.url) {
    resolvedUrl = moment.url;
  } else if (moment.images && Array.isArray(moment.images) && moment.images.length > 0) {
    const im = moment.images[0];
    if (typeof im === 'string') resolvedUrl = im;
    else resolvedUrl = im?.file_url || im?.url;
  }
  
  if (isValidUrl(resolvedUrl)) {
    return absoluteUrl(resolvedUrl);
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
    // Prefer readable names, but don't inject a generic 'Unknown Creator' into the meta.
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
  // Build appended meta only from available values (creator and tags).
  // Use a readable creator name (prefer first/last, otherwise username/string) so single-word usernames are included.
  const readableCreator = creatorFirstnameLastname || creatorDisplay || null;
  const appendedParts = [];
  if (readableCreator) appendedParts.push(readableCreator);
  if (tagsCsv) appendedParts.push(`Tags: ${tagsCsv}`);
  const appendedMeta = appendedParts.join(' | ');
  const fullDescription = baseDescription ? (appendedMeta ? `${baseDescription} - ${appendedMeta}` : baseDescription) : appendedMeta;

    let imageUrl = null;
    if (story.cover_image) {
      if (typeof story.cover_image === 'string') {
        if (isValidUrl(story.cover_image)) imageUrl = absoluteUrl(story.cover_image);
      } else {
        const coverUrl = story.cover_image.file_url || story.cover_image.url;
        if (isValidUrl(coverUrl)) imageUrl = absoluteUrl(coverUrl);
      }
    }
    // Fallback to first verse image if no cover image
    if (!imageUrl && Array.isArray(story.verses) && story.verses.length > 0) {
      for (const verse of story.verses) {
        if (verse && Array.isArray(verse.moments) && verse.moments.length > 0) {
          const momentImage = resolveMomentImageUrl(verse.moments[0]);
          if (momentImage) {
            imageUrl = momentImage;
            break;
          }
        }
      }
    }

    // If a verse query param is present, try to return verse-specific metadata
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

        // First moment image for OG
        let verseImage = null;
        if (Array.isArray(verse.moments) && verse.moments.length > 0) {
          verseImage = resolveMomentImageUrl(verse.moments[0]);
        }
        // Fallback to story cover
        if (!verseImage && imageUrl) verseImage = imageUrl;

        // Determine if contribution (author differs from story creator)
        const verseAuthorObj = verse.author;
        const creatorObjRef = story.creator;
        const creatorId = creatorObjRef ? (creatorObjRef.id ?? creatorObjRef.public_id ?? creatorObjRef) : null;
        const verseAuthorId = verseAuthorObj ? (verseAuthorObj.id ?? verseAuthorObj.public_id ?? verseAuthorObj) : null;
        const isContribution = creatorId && verseAuthorId ? String(creatorId) !== String(verseAuthorId) : false;

        const readableVerseAuthor = typeof verseAuthorObj === 'string' ? verseAuthorObj : (verseAuthorObj?.name || verseAuthorObj?.username || verseAuthorObj?.display_name || null);

        const appendedPartsVerse = [];
        if (readableVerseAuthor) appendedPartsVerse.push(readableVerseAuthor);
        if (isContribution) appendedPartsVerse.push('Contributed');
        if (tagsCsv) appendedPartsVerse.push(`Tags: ${tagsCsv}`);
        const appendedVerseMeta = appendedPartsVerse.join(' | ');

        const verseDescription = excerpt ? (appendedVerseMeta ? `${excerpt} - ${appendedVerseMeta}` : excerpt) : (appendedVerseMeta || `A verse in ${story.title}`);

        const finalTitle = `${verseTitle} — ${story.title} - StoryVermo`;

        return {
          title: finalTitle,
          description: verseDescription,
          openGraph: {
            title: finalTitle,
            description: verseDescription,
            type: 'article',
            url: siteUrl(`/stories/${encodeURIComponent(story.slug || '')}?verse=${encodeURIComponent(verseId)}`),
            authors: readableVerseAuthor ? [readableVerseAuthor] : undefined,
            tags: tagList,
            images: verseImage ? [{ url: verseImage, alt: verseTitle || story.title, width: 1200, height: 630 }] : undefined,
          },
          twitter: {
            card: verseImage ? 'summary_large_image' : 'summary',
            title: finalTitle,
            description: verseDescription,
            images: verseImage ? [verseImage] : undefined,
          },
          keywords: ['verse', 'storyvermo', readableVerseAuthor, ...tagList].filter(Boolean).join(', ').toLowerCase(),
          author: readableVerseAuthor || undefined,
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
        images: imageUrl ? [{ url: imageUrl, alt: story.title || 'Story cover', width: 1200, height: 630 }] : undefined,
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