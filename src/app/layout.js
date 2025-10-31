import Head from 'next/head';
import './globals.css';
import { AuthProvider } from '../../contexts/AuthContext';
import Sidebar from './components/Sidebar';
import ShareModal from './components/ShareModal';
import CommentModal from './components/CommentModal';
import GlobalShell from './components/GlobalShell';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
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
        
        {/* SEO Meta Tags */}
        <meta name="description" content="Everyday moments become stories. Write, snap, and create them with others." />
        <meta name="keywords" content="story, verse, moments, StoryVermo, social storytelling, layered stories, story platform, creative writing, story sharing, story community, story perspectives, storytelling" />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content="StoryVermo - Every moment has a story" />
        <meta property="og:description" content="Everyday moments become stories. Write, snap, and create them with others." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://storyvermo.com" />
        <meta property="og:site_name" content="StoryVermo" />
        <meta property="og:image" content="https://storyvermo.com/android-chrome-512x512.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@storyvermo" />
        <meta name="twitter:title" content="StoryVermo - Every moment has a story" />
        <meta name="twitter:description" content="Everyday moments become stories. Write, snap, and create them with others." />
        <meta name="twitter:image" content="https://storyvermo.com/android-chrome-512x512.png" />
        
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
      </Head>
      
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
          
          {/* Share Modal Component */}
          <ShareModal />
          
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