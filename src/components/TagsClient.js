import React, { useState } from 'react';

const TAG_VIEWS = ['Recent', 'Trending', 'Following', 'For You'];

export default function TagsClient({ initialView = 'Recent' }) {
  const [view, setView] = useState(initialView);

  // Placeholder: Replace with real data fetching logic
  const renderContent = () => {
    switch (view) {
      case 'Trending':
        return <div>Trending tags will appear here.</div>;
      case 'Following':
        return <div>Tags you follow will appear here.</div>;
      case 'For You':
        return <div>Personalized tags for you will appear here.</div>;
      case 'Recent':
      default:
        return <div>Recent tags will appear here.</div>;
    }
  };

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {TAG_VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              fontWeight: view === v ? 'bold' : 'normal',
              textDecoration: view === v ? 'underline' : 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {v}
          </button>
        ))}
      </nav>
      <section>{renderContent()}</section>
    </div>
  );
}
