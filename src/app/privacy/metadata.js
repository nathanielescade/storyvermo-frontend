// src/app/privacy/metadata.js

const title = "Privacy Policy | StoryVermo";
const description = "Read the StoryVermo Privacy Policy: how we collect, use, and protect your data when you use our creative storytelling platform.";
const url = "https://storyvermo.com/privacy";

/** @type {import('next').Metadata} */
const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url,
    siteName: "StoryVermo",
    type: "article",
    images: [
      {
        url: "/site.webmanifest", // Replace with a real OG image if available
        width: 1200,
        height: 630,
        alt: "StoryVermo Privacy Policy"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: "@storyvermo",
    creator: "@storyvermo"
  },
  alternates: {
    canonical: url
  }
};

export default metadata;
