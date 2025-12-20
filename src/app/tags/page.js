// src/app/tags/page.js
'use client';

import dynamic from 'next/dynamic';
const TagsClient = dynamic(() => import('../../components/TagsClient'), { ssr: false });

export default function TagsPage() { 
  return <TagsClient />; 
} 