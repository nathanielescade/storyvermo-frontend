// components/verseviewer/utils.js
import { absoluteUrl } from '../../../../lib/api';

export const getMomentImageUrl = (moment) => {
  if (!moment) return null;
  if (typeof moment === 'string') return absoluteUrl(moment);
  if (moment.image) {
    if (typeof moment.image === 'string') return absoluteUrl(moment.image);
    if (Array.isArray(moment.image) && moment.image.length > 0) {
      const im = moment.image[0];
      if (!im) return null;
      if (typeof im === 'string') return absoluteUrl(im);
      return absoluteUrl(im.file_url || im.url || im);
    }
    if (moment.image.file_url) return absoluteUrl(moment.image.file_url);
    if (moment.image.url) return absoluteUrl(moment.image.url);
    if (moment.image.file) {
      if (typeof moment.image.file === 'string') return absoluteUrl(moment.image.file);
      if (moment.image.file.url) return absoluteUrl(moment.image.file.url);
    }
  }
  if (moment.file_url) return absoluteUrl(moment.file_url);
  if (moment.url) return absoluteUrl(moment.url);
  if (moment.images && Array.isArray(moment.images) && moment.images.length > 0) {
    const im = moment.images[0];
    if (!im) return null;
    if (typeof im === 'string') return absoluteUrl(im);
    return absoluteUrl(im.file_url || im.url || im);
  }
  return null;
};

export const getAuthor = (verse) => {
  return verse?.author || null;
};

export const getAuthorDisplayName = (verse) => {
  const a = getAuthor(verse);
  if (!a) return 'Poster Name';

  if (a.account_type === 'brand' && a.brand_name) {
    return a.brand_name;
  }

  const full = a.get_full_name || a.full_name || a.display_name || a.name;
  if (full) return full;

  const first = a.first_name || a.firstname || '';
  const last = a.last_name || a.lastname || '';
  if (first || last) return `${first} ${last}`.trim();

  return a.username || a.public_id || 'Poster Name';
};

export const getAuthorProfileImageUrl = (verse) => {
  const a = getAuthor(verse);
  if (!a) return null;
  if (a.profile_image_url) return absoluteUrl(a.profile_image_url);
  const maybe = a.profile_image || a.image || a.avatar || a.photo || a.picture || (a.profile && (a.profile.image || a.profile.avatar));
  if (!maybe) return null;
  if (typeof maybe === 'string') return absoluteUrl(maybe);
  if (maybe.url) return absoluteUrl(maybe.url);
  if (maybe.file_url) return absoluteUrl(maybe.file_url);
  return null;
};

export const getAuthorInitial = (verse) => {
  const name = getAuthorDisplayName(verse) || getAuthorUsername(verse) || 'P';
  return (name && name.charAt && name.charAt(0).toUpperCase()) || 'P';
};

export const getAuthorUsername = (verse) => {
  if (!verse) return null;
  const a = verse.author;
  if (!a) return verse.author_name || verse.author_username || null;
  if (typeof a === 'string') return a;
  if (a.username) return a.username;
  if (a.user && a.user.username) return a.user.username;
  if (a.profile && a.profile.username) return a.profile.username;
  return verse.author_name || verse.author_username || null;
};

export const getUserId = (user) => {
  if (!user) return null;
  
  if (typeof user === 'number' || typeof user === 'string') {
    return user;
  }
  
  if (user.id !== undefined) {
    return user.id;
  }
  
  if (user.public_id !== undefined) {
    return user.public_id;
  }
  
  return null;
};