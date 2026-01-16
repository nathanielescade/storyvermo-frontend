// 🔥 METADATA IS HANDLED IN metadata.js
// Having generateMetadata in both layout.js and metadata.js causes conflicts
// Next.js will use metadata.js for this route's generateMetadata

// Enable ISR: revalidate metadata every 10 seconds
export const revalidate = 10;

export default function StoryLayout({ children }) {
  return children;
}
