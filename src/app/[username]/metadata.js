// src/app/[username]/metadata.js
import { userApi, absoluteUrl } from '../../../lib/api';

export async function generateMetadata({ params }) {
  try {
    const username = params?.username;
    const user = await userApi.getProfile(username);

    if (!user) {
      return {
        title: 'Profile Not Found - StoryVermo',
        description: 'Profile not found.',
      };
    }

    const displayName = user.get_full_name || user.name || user.username || '';
    const title = `${displayName} - StoryVermo`;
    const bio = user.bio || '';
    const image = user.profile_image_url ? absoluteUrl(user.profile_image_url) : undefined;

    return {
      title,
      description: bio || `Profile of ${displayName}`,
      openGraph: {
        title,
        description: bio || `Profile of ${displayName}`,
        type: 'profile',
        profile: {
          username: user.username,
          firstName: user.first_name || undefined,
          lastName: user.last_name || undefined,
        },
        images: image ? [{ url: image, alt: displayName, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: bio || `Profile of ${displayName}`,
        images: image ? [image] : undefined,
      },
      author: displayName,
      publisher: 'StoryVermo',
    };
  } catch (err) {
    return {
      title: 'Profile Not Found - StoryVermo',
      description: 'Profile not found.',
    };
  }
}