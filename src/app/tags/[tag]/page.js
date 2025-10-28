import Home from '../../page';
import { tagsApi, absoluteUrl } from '../../../../lib/api';

// Provide SEO metadata for the /tags/[tag] page so crawlers see useful content.
export async function generateMetadata({ params }) {
  const tagSlug = params.tag || '';
  // Normalize a readable tag name from slug
  const prettyTag = (() => {
    try {
      return decodeURIComponent(tagSlug).replace(/[-_]+/g, ' ');
    } catch (e) {
      return tagSlug.replace(/[-_]+/g, ' ');
    }
  })();

  // Default metadata derived from the slug. We avoid relying on backend API
  // to ensure metadata is always present for crawlers and social previews.
  const title = `${prettyTag ? prettyTag.charAt(0).toUpperCase() + prettyTag.slice(1) : 'Tags'} — StoryVermo`;
  const description = `Read stories tagged ${prettyTag || 'tags'} on StoryVermo.`;
  const url = absoluteUrl(`/tags/${encodeURIComponent(tagSlug)}/`);

  // Try to enrich metadata from the API but fall back to defaults on any error.
  try {
    const seo = await tagsApi.getTagSEO(tagSlug);
    const apiTagName = seo?.tag?.name;
    const apiDescription = seo?.tag?.description;
    if (apiTagName) {
      // prefer API-provided name/description when available
      const aTitle = `${apiTagName} — StoryVermo`;
      const aDesc = apiDescription || description;
      return {
        title: aTitle,
        description: aDesc,
        openGraph: {
          title: aTitle,
          description: aDesc,
          url,
          siteName: 'StoryVermo',
        },
        twitter: {
          card: 'summary_large_image',
          title: aTitle,
          description: aDesc,
        },
        alternates: { canonical: url }
      };
    }
  } catch (e) {
    // ignore and fall back to defaults below
    console.debug('[generateMetadata] tag seo fetch failed', e);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'StoryVermo',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: url }
  };
}
// Only render the interactive homepage on this route. Metadata above provides
// SEO content for crawlers; we avoid adding any server-side visible text here.
export default function TagPage() {
  return <Home />;
}
