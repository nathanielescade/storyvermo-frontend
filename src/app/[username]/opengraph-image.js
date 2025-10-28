// src/app/[username]/opengraph-image/route.js
import { ImageResponse } from 'next/og';
import { userApi, absoluteUrl } from '../../../lib/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const user = await userApi.getProfile(username);

    const imageUrl = user?.profile_image_url ? absoluteUrl(user.profile_image_url) : null;

    if (imageUrl) {
      return new ImageResponse(
        (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e27' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e27', color: '#fff', padding: 48 }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 56, marginBottom: 12 }}>{user?.get_full_name || user?.username || 'Profile'}</h1>
            {user?.bio && <p style={{ fontSize: 28, opacity: 0.85 }}>{user.bio.slice(0, 120)}</p>}
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err) {
    console.error('OG image error:', err);
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e27', color: '#fff' }}>
          <h1 style={{ fontSize: 48 }}>Profile</h1>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}

// Add default export to fix the error
export default function Page() {
  return null;
}