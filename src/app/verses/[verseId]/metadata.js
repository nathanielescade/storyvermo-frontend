// app/verses/[verseId]/metadata.js
import { versesApi, absoluteUrl, siteUrl } from '../../../../lib/api';

export const revalidate = 10;

function isValidUrl(url) {
  return url && typeof url === 'string' && url.trim().length > 0 && (url.startsWith('http') || url.startsWith('/'));
}

export async function generateMetadata({ params }) {
  try {
    const { verseId } = await params;
    
    // Try to fetch the verse directly or search for it
    const verse = await versesApi.getVerseBySlug(verseId).catch(() => null);

    if (!verse) {
      return {
        title: 'Verse Not Found - StoryVermo',
        description: 'The verse you\'re looking for doesn\'t exist or might have been deleted.',
      };
    }

    const storyTitle = verse.story?.title || 'A Story';
    const verseTitle = verse.title ? String(verse.title).trim() : '';
    const content = verse.content ? String(verse.content).trim() : '';
    const excerpt = content.length > 160 ? `${content.slice(0, 160)}...` : content;

    const authorObj = verse.author || verse.creator;
    const authorDisplay = typeof authorObj === 'string'
      ? authorObj
      : authorObj?.name || [authorObj?.first_name, authorObj?.last_name].filter(Boolean).join(' ') || authorObj?.username || null;

    const finalTitle = `${verseTitle || 'Verse'} — ${storyTitle} - StoryVermo`;
    const description = excerpt || `A verse in ${storyTitle}`;

    let imageUrl = null;
    if (verse.moments && Array.isArray(verse.moments) && verse.moments.length > 0) {
      const firstMoment = verse.moments[0];
      if (firstMoment) {
        const momentUrl = typeof firstMoment === 'string' 
          ? firstMoment 
          : (firstMoment.image?.file_url || firstMoment.image?.url || firstMoment.file_url || firstMoment.url);
        if (isValidUrl(momentUrl)) {
          imageUrl = absoluteUrl(momentUrl);
        }
      }
    }

    return {
      title: finalTitle,
      description: description.slice(0, 160),
      keywords: 'verse, story, storytelling, creative writing',
      openGraph: {
        title: finalTitle,
        description: description.slice(0, 160),
        type: 'article',
        url: `${siteUrl}/verses/${verseId}`,
        ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630 }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: finalTitle,
        description: description.slice(0, 160),
        ...(imageUrl && { image: imageUrl }),
      },
      canonical: `${siteUrl}/verses/${verseId}`,
    };
  } catch (error) {
    console.error('Error generating verse metadata:', error);
    return {
      title: 'Verse - StoryVermo',
      description: 'Read and enjoy verses on StoryVermo',
    };
  }
}
