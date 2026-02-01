// Root layout: keep global favicons, PWA and schema, but avoid hardcoding
// title/description/OG/Twitter so route metadata (generateMetadata) can take effect.
import './globals.css';
import { AuthProvider } from '../../contexts/AuthContext';
import Sidebar from './components/Sidebar';
import CommentModal from './components/CommentModal';
import GlobalShell from './components/GlobalShell';
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="google-site-verification" content="wJjq83au-maldcRICvQfKYPlbzQ1pdustQ_GOSqJuVY" />

        {/* 🔥 CRITICAL PRECONNECTS - Load these FIRST */}
        <link rel="preconnect" href="https://storyvermo.nyc3.cdn.digitaloceanspaces.com" />
        <link rel="dns-prefetch" href="https://storyvermo.nyc3.cdn.digitaloceanspaces.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="canonical" href={`https://www.storyvermo.com${pathname}`} />
        {/* Font preload removed to avoid adding large font to initial payload; CSS is deferred below */}

        {/* Google Analytics - DEFERRED to lazyOnload for even better performance */}
        {process.env.NODE_ENV === 'production' && (
          <>  
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-JCM36RQZ8G"
              strategy="lazyOnload"  // 🔥 OPTIMIZED: Defer to lazyOnload to reduce critical path
            />
            <Script id="gtag-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);} 
                if (typeof window.gtag === 'undefined') {
                  window.gtag = gtag;
                }
                gtag('js', new Date());
                gtag('config', 'G-JCM36RQZ8G', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

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

        {/* 🔥 CRITICAL: Font Awesome must load on critical path for icons to show on first visit */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
        />

        {/* 🔥 OPTIMIZED: Defer Swiper CSS (non-blocking) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css"
          media="print"
        />

        {/* Client-side flipping of deferred CSS media (Swiper only now - Font Awesome is critical) */}
        <Script id="deferred-css" strategy="lazyOnload">
          {`
            (function(){
              try {
                const hrefs = [
                  'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css'
                ];
                hrefs.forEach((href) => {
                  const link = document.querySelector('link[rel="stylesheet"][href="' + href + '"]');
                  if (!link) return;
                  if (link.sheet) {
                    link.media = 'all';
                    return;
                  }
                  link.addEventListener('load', function(){ link.media = 'all'; });
                  // fallback in case load doesn't fire
                  setTimeout(function(){ link.media = 'all'; }, 5000);
                });
              } catch (e) {
                // ignore
              }
            })();
          `}
        </Script>

        {/* 🔥 ADD FONT-DISPLAY: SWAP for Font Awesome */}


        {/* Global Site Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: `
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
        `}} />

        {/* Organization Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: `
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
        `}} />
      </head>
      
      <body className="bg-black text-white font-rajdhani" data-authenticated="false">
        <AuthProvider>
          <Sidebar />
          <GlobalShell />
          
          <main className="main-content">
            {children}
          </main>
          
          {/* <CommentModal /> */}
          
          {/* 🔥 OPTIMIZED: Service Worker Registration (deferred) */}
          <Script id="sw-register" strategy="lazyOnload">
            {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js').catch(function(err) {
                  });
                });
              }
            `}
          </Script>
        </AuthProvider>
      </body>
    </html>
  );
}