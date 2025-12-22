'use client'


import React, { useEffect, useState } from "react";
// If you have an auth context, import it here
// import { useAuth } from "../contexts/AuthContext";
import { storiesApi } from "../../lib/api";

export default function HomePage() {
  // If you have an auth context, use it here
  // const { isAuthenticated } = useAuth();
  // For demo, we'll just set isAuthenticated to false
  const isAuthenticated = false;

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTag, setCurrentTag] = useState('for-you');

  useEffect(() => {
    async function fetchStories() {
      try {
        // You can switch API calls based on currentTag here
        const data = await storiesApi.getPaginatedStories({ page_size: 10 });
        setStories(data.results || data || []);
      } catch (err) {
        setError("Failed to load stories");
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [currentTag]);

  function handleTagOptionClick(tagName) {
    setCurrentTag(tagName);
    setLoading(true);
    setError(null);
    // Optionally, refetch stories for the selected tag
  }

  const tagOptions = [
    { id: 'for-you', name: 'for-you', display_name: 'For You' },
    { id: 'trending', name: 'trending', display_name: 'Trending' },
    { id: 'recent', name: 'recent', display_name: 'Recent' },
    { id: 'following', name: 'following', display_name: 'Following', requiresAuth: true }
  ];

  return (
    <main className="image-feed">
      {/* Tag Switcher Bar */}
      <div
        id="tagSwitcher"
        className="fixed left-1/2 top-8 transform -translate-x-1/2 bg-black/50 rounded-full z-10 flex px-1 py-1"
        style={{
          width: '90%',
          maxWidth: '500px',
          border: '2px solid rgba(80, 105, 219, 0.4)'
        }}
      >
        {tagOptions.map(option => {
          const isDisabled = option.requiresAuth && !isAuthenticated;
          const isActive = currentTag === option.name;
          const url = `/tags/${encodeURIComponent(option.name)}`;
          return (
            <a
              key={option.id}
              href={url}
              tabIndex={isDisabled ? -1 : 0}
              className={`tag-option ${option.name} px-2 py-2 text-sm font-semibold cursor-pointer transition-all duration-150 ease-out transform-gpu flex-1 ${
                isActive
                  ? 'bg-gradient-to-r from-accent-orange/90 to-neon-pink/90 border border-accent-orange text-white scale-105 opacity-100'
                  : isDisabled
                    ? 'text-white/40 cursor-not-allowed opacity-50'
                    : 'text-white/80 hover:text-white hover:bg-white/10 opacity-60 hover:opacity-90'
              } rounded-full focus:outline-none focus:ring-2 focus:ring-neon-blue/50 truncate`}
              onClick={e => {
                e.preventDefault();
                if (!isDisabled) handleTagOptionClick(option.name);
              }}
            >
              {option.display_name}
              {isDisabled && ' (Login Required)'}
            </a>
          );
        })}
      </div>

      {/* Stories Feed */}
      {loading ? (
        <div style={{color: 'white', textAlign: 'center', paddingTop: '40vh'}}>Loading...</div>
      ) : error ? (
        <div style={{color: 'red', textAlign: 'center', paddingTop: '40vh'}}>{error}</div>
      ) : stories.length === 0 ? (
        <div style={{color: 'white', textAlign: 'center', paddingTop: '40vh'}}>No stories found.</div>
      ) : (
        stories.map((story) => (
          <section key={story.public_id || story.id} className="scene-card">
            <img
              src={story.cover_image?.file_url || story.cover_image?.url || story.image_url || story.image || ""}
              alt={story.title}
              style={{
                objectFit: "cover",
                width: "100vw",
                height: "100vh",
                position: "absolute",
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                color: "white",
                textAlign: "center",
                padding: "2rem",
                background: "rgba(0,0,0,0.4)",
                borderRadius: "1rem",
                maxWidth: "80vw",
                margin: "auto",
              }}
            >
              <h2 style={{ fontFamily: "var(--font-orbitron)", fontSize: "2.5rem", color: "var(--color-neon-blue)" }}>{story.title}</h2>
              <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "1.2rem", margin: "1rem 0" }}>{story.description || story.summary}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
                <img src={story.creator?.avatar_url || story.creator?.profile_image || "/public/avatar.png"} alt={story.creator?.username || "user"} style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid var(--color-neon-pink)" }} />
                <span style={{ fontFamily: "var(--font-rajdhani)", fontWeight: "bold", color: "var(--color-neon-purple)" }}>{story.creator?.username || "Unknown"}</span>
              </div>
              {/* Action buttons (like, comment, share) */}
              <div style={{ marginTop: "2rem", display: "flex", gap: "2rem", justifyContent: "center" }}>
                <button style={{ background: "var(--color-neon-blue)", color: "#fff", border: "none", borderRadius: "50%", width: 56, height: 56, fontSize: "1.5rem", boxShadow: "0 0 10px var(--color-neon-blue)" }}>❤</button>
                <button style={{ background: "var(--color-neon-purple)", color: "#fff", border: "none", borderRadius: "50%", width: 56, height: 56, fontSize: "1.5rem", boxShadow: "0 0 10px var(--color-neon-purple)" }}>💬</button>
                <button style={{ background: "var(--color-neon-pink)", color: "#fff", border: "none", borderRadius: "50%", width: 56, height: 56, fontSize: "1.5rem", boxShadow: "0 0 10px var(--color-neon-pink)" }}>↗</button>
              </div>
            </div>
          </section>
        ))
      )}
    </main>
  );
}
