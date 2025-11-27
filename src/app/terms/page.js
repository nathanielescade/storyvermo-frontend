// src/app/terms/page.js
"use client";

import React from "react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-indigo-950 text-white py-16 px-4 md:px-0 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-900/80 to-indigo-900/80 border border-purple-500/20 rounded-3xl shadow-2xl shadow-purple-500/10 p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-6 text-center">
          Terms of Service
        </h1>
        <p className="text-lg text-gray-300 mb-8 text-center">
          Please read these Terms of Service (&quot;Terms&quot;) carefully before using StoryVermo.
        </p>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-200">By accessing or using StoryVermo, you agree to be bound by these Terms. If you do not agree, please do not use the platform.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">2. User Accounts</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>You must provide accurate and complete information when creating an account.</li>
            <li>You are responsible for maintaining the confidentiality of your account and password.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must be at least 13 years old to use StoryVermo.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">3. Content & Copyright</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>You retain ownership of the content you create and share on StoryVermo.</li>
            <li>By posting content, you grant StoryVermo a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content for platform purposes.</li>
            <li>You must not post content that infringes on others’ rights, is unlawful, or violates these Terms.</li>
            <li>We may remove content that violates our policies or the law.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">4. Prohibited Conduct</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>No harassment, hate speech, or abusive behavior.</li>
            <li>No posting of illegal, harmful, or explicit content.</li>
            <li>No unauthorized use of others’ intellectual property.</li>
            <li>No spamming, phishing, or malicious activity.</li>
            <li>No attempts to disrupt or harm the platform or its users.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">5. Termination</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>We may suspend or terminate your account if you violate these Terms or applicable laws.</li>
            <li>You may delete your account at any time by contacting us at <a href="mailto:storyvermo@gmail.com" className="underline text-cyan-300">storyvermo@gmail.com</a>.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">6. Disclaimers & Limitation of Liability</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>StoryVermo is provided &quot;as is&quot; without warranties of any kind.</li>
            <li>We are not liable for any damages resulting from your use of the platform.</li>
            <li>We do not guarantee the accuracy, reliability, or availability of the platform or user content.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">7. Changes to Terms</h2>
          <p className="text-gray-200">We may update these Terms from time to time. Continued use of StoryVermo after changes means you accept the new Terms.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">8. Contact</h2>
          <p className="text-gray-200">Questions? <Link href="/contact" className="underline text-cyan-300">Contact us</Link> or email <a href="mailto:storyvermo@gmail.com" className="underline text-cyan-300">storyvermo@gmail.com</a>.</p>
        </section>
        <div className="text-xs text-gray-500 text-center mt-8">
          Last updated: November 27, 2025
        </div>
      </div>
    </div>
  );
}
