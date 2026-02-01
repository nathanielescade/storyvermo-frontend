import VerseViewer from '../../components/VerseViewer';
import { absoluteUrl } from '../../../../lib/api';

// Generate static params for verse routes to enable Google indexing
export async function generateStaticParams() {
  try {
    console.log('Generating static params for verse IDs...');
    
    // Fetch verses from the API - adjust endpoint if needed based on your API structure
    const verses = await fetch(absoluteUrl(`/api/verses/?page_size=500`), {
      headers: { 'Accept': 'application/json' }
    })
      .then(r => r.json())
      .catch(err => {
        console.error('Failed to fetch verses for static generation:', err);
        return { results: [] };
      });

    if (!verses || !verses.results) {
      console.warn('No verses returned for static generation');
      return [];
    }

    const params = verses.results
      .filter(v => v && (v.verseId || v.id))
      .map(v => ({ verseId: String(v.verseId || v.id).trim() }))
      .slice(0, 1000);

    console.log(`Generated ${params.length} static verse routes`);
    return params;
  } catch (error) {
    console.error('generateStaticParams error:', error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { verseId } = params;
  try {
    const res = await fetch(absoluteUrl(`/api/verses/${verseId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Verse not found');
    const verse = await res.json();
    const title = verse.content ? `${verse.content.slice(0, 60)}...` : 'Verse - StoryVermo';
    const description = verse.content || 'Verse from StoryVermo';
    const image = verse.images && verse.images.length > 0 ? absoluteUrl(verse.images[0]) : undefined;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image, alt: title, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch (err) {
    return {
      title: 'Verse Not Found - StoryVermo',
      description: 'Verse not found.',
    };
  }
}

export default async function VersePage({ params }) {
  const { verseId } = params;
  let verse = null;
  try {
    const res = await fetch(absoluteUrl(`/api/verses/${verseId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      verse = await res.json();
    }
  } catch (err) {
    // ignore
  }
  return <VerseViewer verse={verse} />;
}
