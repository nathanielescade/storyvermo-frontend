// src/app/[username]/page.js

// Server component: renders the client profile view and passes params safely
import ProfileClient from './ProfileClient';

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

  return <ProfileClient username={username} />;
}

// Generate static metadata for SEO
export async function generateMetadata({ params }) {
  // Await the params before using its properties
  const { username } = await params;
  
  return {
    title: `${username}'s Profile | StoryVermo`,
    description: `View ${username}'s stories and profile on StoryVermo.`,
  };
}