// src/app/terms/metadata.js

const title = "Terms of Service | StoryVermo";
const description = "Read the StoryVermo Terms of Service: your rights, responsibilities, and rules for using our creative storytelling platform.";
const url = "https://storyvermo.com/terms";

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
        alt: "StoryVermo Terms of Service"
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
