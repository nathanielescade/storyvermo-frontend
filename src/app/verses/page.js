// src/app/verses/page.js
import { siteUrl } from '../../../lib/api';
import VersesClient from './VersesClient';

export async function generateMetadata() {
  const title = 'Verses — StoryVermo';
  const description = 'Explore the latest verses from storytellers on StoryVermo — short, powerful moments captured within stories.';

  const url = siteUrl('/verses/');
  return { title, description, alternates: { canonical: url } };
}

export default function VersesPage() {
  return (
    <div className="pt-24 pb-12 bg-black">
      <div className="px-4 md:px-6 lg:px-8">
        {/* Header outside bordered div */}
        <header className="mb-8 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center shadow-lg shadow-cyan-500/40 border border-cyan-500/30">
              <i className="fas fa-book-open text-cyan-400 text-xl"></i>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500">
              Verses
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-300 mt-3 ml-15">
            Browse verses from stories. Click a verse to open its story and jump to that verse.
          </p>
        </header>

        <VersesClient />

      </div>
    </div>
  );
}