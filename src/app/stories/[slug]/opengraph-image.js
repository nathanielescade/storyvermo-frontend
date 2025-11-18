// src/app/stories/[slug]/opengraph-image/route.js
import { ImageResponse } from 'next/og';
import { storiesApi } from '../../../../lib/api';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    // Fetch story data
    const story = await storiesApi.getStoryBySlug(slug);
    
    // Return story cover image if it exists
    if (story && story.cover_image) {
      const imageUrl = typeof story.cover_image === 'string' 
        ? story.cover_image 
        : story.cover_image.file_url || story.cover_image.url;

      return new ImageResponse(
        (
          <div
            style={{
              background: 'linear-gradient(45deg, #1a1a1a, #2a2a2a)',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={imageUrl}
              alt={story.title}
              style={{
                objectFit: 'cover',
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        ),
        {
          width: 1200,
          height: 630,
        },
      );
    }

    // Default image if no cover image exists
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(45deg, #1a1a1a, #2a2a2a)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
          }}
        >
          <h1
            style={{
              fontSize: '60px',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '20px',
              fontWeight: 'bold',
            }}
          >
            {story?.title || 'Story Not Found'}
          </h1>
          {story?.description && (
            <p
              style={{
                fontSize: '30px',
                color: '#cccccc',
                textAlign: 'center',
                maxWidth: '800px',
              }}
            >
              {story.description.slice(0, 100)}
              {story.description.length > 100 ? '...' : ''}
            </p>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error('Error generating OpenGraph image:', error);
    
    // Return default error image
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(45deg, #1a1a1a, #2a2a2a)',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '60px',
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            Story Not Found
          </h1>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  }
}

// Add default export to fix the error
export default function Page() {
  return null;
}