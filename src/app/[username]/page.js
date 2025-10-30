// src/app/[username]/page.js

// Server component: renders the client profile view and passes params safely
import ProfileClient from './ProfileClient';
import { userApi } from '../../../lib/api';

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
      initialProfile.get_full_name = `${initialProfile.first_name || ''} ${initialProfile.last_name || ''}`.trim() || initialProfile.username;
    }
  } catch (err) {
    // ignore - client will handle missing profile
    console.debug('[Page] failed to fetch initial profile:', err?.message || err);
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
    console.debug('[generateMetadata] failed to fetch profile for metadata:', err?.message || err);
  }

  return {
    title: `${displayName} | StoryVermo`,
    description: `View ${displayName}'s stories and profile on StoryVermo.`,
  };
}