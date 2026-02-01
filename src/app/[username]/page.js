// src/app/[username]/page.js

// Server component: renders the client profile view and passes params safely
import ProfileClient from './ProfileClient';
import { userApi } from '../../../lib/api';

// ISR: Revalidate every 10 seconds for fresh profile data
// Ensures instant page loads while keeping data fresh
export const revalidate = 10;

export default async function Page({ params }) {
  // Await the params before using its properties
  const { username } = await params;

  // Return 404 if no username
  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-slate-900">
        <div className="text-gray-400">User not found</div>
      </div>
    );
  }

  // Fetch profile data server-side and pass as initial data so the client
  // can render immediately without a loading state. This keeps the page
  // fast and avoids the client-only blank/loading screen.
  let initialProfile = null;
  try {
    initialProfile = await userApi.getProfile(username);
    if (initialProfile) {
      // Derive a sensible full name from multiple possible API fields
      const first = initialProfile.first_name || initialProfile.creator_first_name || '';
      const last = initialProfile.last_name || initialProfile.creator_last_name || '';
      const explicitFull = initialProfile.get_full_name || initialProfile.full_name || initialProfile.name || initialProfile.display_name || '';
      const combined = `${first} ${last}`.trim();
      initialProfile.get_full_name = (explicitFull && explicitFull.trim()) || (combined && combined) || initialProfile.username || '';
    }
  } catch (err) {
    // ignore - client will handle missing profile
  }

  return <ProfileClient username={username} initialProfile={initialProfile} />;
}

// Generate static metadata for SEO
export async function generateMetadata({ params }) {
  // Await the params before using its properties
  const { username } = await params;
  // Prefer first + last name for the title/description when available,
  // otherwise fall back to the username.
  let displayName = username;
  try {
    const profile = await userApi.getProfile(username);
    if (profile) {
      const first = profile.first_name || profile.creator_first_name || '';
      const last = profile.last_name || profile.creator_last_name || '';
      const full = `${first} ${last}`.trim();
      if (full) displayName = full;
    }
  } catch (err) {
    // Ignore - fall back to username
  }

  return {
    title: `${displayName} | StoryVermo`,
    description: `View ${displayName}'s stories and profile on StoryVermo.`,
  };
}

// Pre-generate static params for dynamic user profiles
// This is CRITICAL for Google indexing - without this, all /[username] pages return 404
export async function generateStaticParams() {
  try {
    console.log('Generating static params for user profiles...');
    
    // Fetch all user profiles from API
    const profiles = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profiles/?page_size=500`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(r => r.json())
      .catch(err => {
        console.error('Failed to fetch profiles for static generation:', err);
        return { results: [] };
      });

    if (!profiles || !profiles.results) {
      console.warn('No profiles returned for static generation');
      return [];
    }

    const params = profiles.results
      .filter(p => p && p.username)
      .map(p => ({ username: String(p.username).trim() }))
      .slice(0, 1000); // Limit to 1000 profiles

    console.log(`Generated ${params.length} static profile routes`);
    return params;
  } catch (error) {
    console.error('generateStaticParams error:', error);
    return [];
  }
}