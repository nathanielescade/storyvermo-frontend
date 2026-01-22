// Small Node test to validate resolveImageSrc logic used by VerseViewer
// Run: node scripts/resolve-image-test.js

const { URL } = require('url');

function resolveImageSrc(input) {
  try {
    if (!input) return null;
    if (typeof input === 'string') return input;
    // In Node environment, File is not available; skip that branch
    if (input.preview) return input.preview;
    if (input.file_url) return input.file_url;
    if (input.url) return input.url;
    if (input.image) {
      if (typeof input.image === 'string') return input.image;
      if (input.image.file_url) return input.image.file_url;
      if (input.image.url) return input.image.url;
      if (input.image.preview) return input.image.preview;
    }
    if (input.moments && Array.isArray(input.moments) && input.moments.length > 0) {
      return resolveImageSrc(input.moments[0]);
    }
    if (input.public_id && typeof input.public_id === 'string') return input.public_id;
    if (input.file && input.file.path) return input.file.path;
    return null;
  } catch (err) {
    return null;
  }
}

const samples = [
  'https://cdn.example.com/image1.jpg',
  { preview: 'data:image/png;base64,XXX' },
  { file_url: 'https://cdn.example.com/verse1.jpg' },
  { url: 'https://cdn.example.com/verse2.jpg' },
  { image: { file_url: 'https://cdn.example.com/nested.jpg' } },
  { moments: [ { image: { url: 'https://cdn.example.com/moment.jpg' } } ] },
  { public_id: 'public_12345' },
  { file: { path: '/tmp/localfile.jpg' } }
];

samples.forEach((s, i) => {
});

