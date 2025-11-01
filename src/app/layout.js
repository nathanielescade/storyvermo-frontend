// Root layout: keep global favicons, PWA and schema, but avoid hardcoding
// title/description/OG/Twitter so route metadata (generateMetadata) can take effect.
import './globals.css';
import { AuthProvider } from '../../contexts/AuthContext';
import Sidebar from './components/Sidebar';
import CommentModal from './components/CommentModal';
import GlobalShell from './components/GlobalShell';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />

        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Core Meta Tags */}
        <meta name="author" content="StoryVermo" />
        <meta name="generator" content="StoryVermo Platform" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="theme-color" content="#0a0e27" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="StoryVermo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="StoryVermo" />

    {/* Note: do not hardcode title/description/OG/Twitter tags here.
      The app router's metadata API (route `metadata` exports / generateMetadata)
      should supply per-route tags. Keeping static SEO tags here prevents
      route-level metadata from taking effect (e.g. story pages).
      We keep favicons, core meta, PWA, schemas, preconnect and styles here. */}

        {/* Preconnect to Critical Origins */}
        <link rel="preconnect" href="https://cdn.tailwindcss.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />

        {/* Stylesheets */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css" />

        {/* Global Site Schema */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "url": "https://storyvermo.com",
              "name": "StoryVermo",
              "description": "StoryVermo is a social storytelling platform where people create and share their stories in a unique way. A story is the core piece of content, and it can stand alone or be expanded with verses and moments that add depth, layers, and different perspectives.",
              "slogan": "Every moment has a story",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://storyvermo.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }
          `}
        </script>

        {/* Organization Schema */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "StoryVermo",
              "url": "https://storyvermo.com",
              "logo": "https://storyvermo.com/storyvermo_logo.png",
              "slogan": "Every moment has a story",
              "description": "StoryVermo is a social storytelling platform where people create and share their stories in a unique way. A story is the core piece of content, and it can stand alone or be expanded with verses and moments that add depth, layers, and different perspectives.",
              "sameAs": [
                "https://twitter.com/storyvermo",
                "https://www.facebook.com/storyvermo",
                "https://www.instagram.com/storyvermo"
              ]
            }
          `}
        </script>
      </head>
      
      <body className="bg-black text-white font-rajdhani" data-authenticated="false">
        <AuthProvider>
          {/* Sidebar Component */}
          <Sidebar />
          {/* Global header, navigation and global modals */}
          <GlobalShell />
          
          {/* Main Content */}
          <main className="main-content">
            {children}
          </main>
          
          {/* ShareModal is rendered by components (StoryCard, VerseViewer) with dynamic props. */}
          
          {/* Remove StoryFormModal from layout since it's already in page.js */}
          
          {/* Comment Modal Component */}
          <CommentModal />
          
          {/* Verse Viewer Component */}
          {/* Discover Modal is now controlled by GlobalShell */}
          
          {/* Service Worker Registration */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/service-worker.js')
                      .then(function(reg) { console.log('ServiceWorker registered:', reg.scope); })
                      .catch(function(err) { console.warn('ServiceWorker registration failed:', err); });
                  });
                }
              `,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}