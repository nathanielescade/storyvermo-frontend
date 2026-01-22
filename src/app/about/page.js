'use client'


import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useState } from 'react';

export default function AboutClient() {
  const { isAuthenticated } = useAuth();
  const [showStoryFormModal, setShowStoryFormModal] = useState(false);

  const handleStartStory = () => {
    setShowStoryFormModal(true);
  };

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani px-4 py-12 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <div className="flex justify-center mb-8">
          <Image
            src="/storyvermo_logo.png"
            alt="StoryVermo Logo"
            width={96}
            height={82}
            className="h-20 w-24"
            priority
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
          🌟 STORYVERMO: WHAT IT IS
        </h1>
        <p className="text-lg text-center text-pink-400 font-semibold mb-6"><span className="font-bold">Every moment has a story</span></p>
        <p className="text-lg md:text-xl text-gray-200 text-center mb-8">
          StoryVermo is a visual storytelling platform where your stories live forever. Document experiences, journeys, and moments with depth, structure, and beauty. Unlike traditional social media, StoryVermo lets you build complete narratives&mdash;giving your memories the canvas they deserve.
        </p>

        {/* Story Structure Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">📖 The Story Structure</h2>
          <p className="text-gray-300 mb-4">
            At its core, StoryVermo is built around three interconnected layers that work together to create rich narratives. 
            The Story itself serves as the foundation - a complete experience you want to share, like a journey through a city or a personal transformation. 
            This main container holds everything together and gives your narrative a permanent home.
          </p>
          <p className="text-gray-300 mb-4">
            Within each Story, you can create Verses - these are the natural chapters that break your experience into meaningful parts. 
            Think of them as the distinct phases or moments that make up your journey, allowing you to organize your narrative in a way that feels natural and engaging.
          </p>
          <p className="text-gray-300">
            Finally, Moments are the individual highlights that bring each Verse to life. 
            They are the specific images and snapshots that capture the essence of each chapter, creating a visual flow that you can swipe through like flipping through the pages of a photo album.
          </p>
        </section>

        {/* User Experience Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-purple-400">📱 How It Works: The Experience</h2>
          <p className="text-gray-300 mb-4">
            Creating a story is simple and intuitive. Start by adding your main narrative, then enhance it with chapters and highlights if you wish. 
            You can invite others to contribute their perspectives, making your story richer and more diverse.
          </p>
          <p className="text-gray-300 mb-4">
            When viewing stories, you&apos;ll scroll through beautiful cards that represent each narrative. 
            Tapping into a story immerses you in a full-screen experience where you can navigate through chapters and highlights with natural gestures.
          </p>
          <p className="text-gray-300">
            Engage with content by liking, commenting, sharing, or bookmarking - either for the entire story or specific chapters that resonate with you.
          </p>
        </section>

        {/* Discovery & Tags Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-pink-400">🏷️ Tags & Discovery</h2>
          <p className="text-gray-300 mb-4">
            Tags are the heartbeat of StoryVermo&apos;s discovery system. They connect your stories to communities and help others find content that matters to them. 
            By following tags that interest you, your feed becomes personalized with relevant stories.
          </p>
          <p className="text-gray-300">
            Trending tags show what&apos;s popular right now, while tag challenges bring the community together around shared themes and experiences. 
            This creates a dynamic environment where stories gain visibility and connections form naturally.
          </p>
        </section>

        {/* Collaboration Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-400">🤝 Collaboration: Stories Together</h2>
          <p className="text-gray-300">
            StoryVermo shines when people create together. You can invite others to contribute to your stories, adding their perspectives and memories. 
            This is perfect for group experiences like trips, weddings, or projects where multiple people have unique viewpoints to share. 
            The result is a richer, more complete narrative that captures the full experience from different angles.
          </p>
        </section>

        {/* Use Cases Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-400">🌍 Who Is StoryVermo For?</h2>
          <p className="text-gray-300">
            StoryVermo is for everyone&mdash;anyone who wants to document, share, and celebrate their experiences, journeys, and moments. 
            Whether it&apos;s a quick snapshot or a deep narrative, StoryVermo adapts to you. 
            From travelers documenting their adventures to families preserving memories, from creators sharing their process to enthusiasts showcasing their passions, 
            StoryVermo provides the perfect canvas for any story worth telling.
          </p>
        </section>

        {/* Core Experience & Vision Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">🎯 The Core Experience</h2>
          <p className="text-gray-300 mb-4">
            StoryVermo offers permanence for your stories, ensuring they live forever rather than disappearing after 24 hours. 
            The structure allows you to organize experiences into meaningful chapters while maintaining flexibility - keep it simple or go as deep as your story requires.
          </p>
          <p className="text-gray-300 mb-4">
            Collaboration brings multiple perspectives together, creating richer narratives. 
            Discovery through tags connects you to communities and stories that matter to you. 
            The beautiful, immersive interface puts your stories front and center, while engagement features let you connect with creators and content.
          </p>
          <p className="text-gray-300">
            Most importantly, you remain in control of your narrative, owning how your stories are told and shared.
          </p>
        </section>

        {/* Vision Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-blue-500">🌟 The Vision</h2>
          <p className="text-gray-300 mb-4">
            StoryVermo exists because stories deserve more than fleeting moments on traditional social media. 
            Experiences have depth that can&apos;t be captured in single posts, memories deserve to be organized rather than scattered, 
            and collaboration makes stories richer by bringing multiple perspectives together.
          </p>
          <p className="text-gray-300">
            We believe communities form naturally around shared passions, and visual storytelling is one of the most powerful ways to connect. 
            Your stories deserve a permanent home where they can be experienced fully - that&apos;s StoryVermo.
          </p>
        </section>

        {/* Final Call to Action */}
        <div className="mt-12 mb-10 text-center">
          <p className="text-lg text-gray-400">Ready to experience stories differently?</p>
          {!isAuthenticated ? (
            <Link href="/signup" className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform">
              Join StoryVermo
            </Link>
          ) : (
            <button
              className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
              onClick={handleStartStory}
            >
              Start Creating a Story
            </button>
          )}
        </div>
      </div>
    </div>
  );
}