'use client';

import React from 'react';
import FeedClient from '../../FeedClient';

export default function TagPage({ params }) {
  const { tag } = React.use(params);
  const decodedTag = decodeURIComponent(tag);

  return (
    <div className="min-h-screen ">
      {/* Feed */}
      <div className="">
        <FeedClient initialTag={decodedTag} />
      </div>
    </div>
  );
}
