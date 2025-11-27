// src/app/privacy/page.js
"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-indigo-950 text-white py-16 px-4 md:px-0 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-900/80 to-indigo-900/80 border border-purple-500/20 rounded-3xl shadow-2xl shadow-purple-500/10 p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-6 text-center">
          Privacy Policy
        </h1>
        <p className="text-lg text-gray-300 mb-8 text-center">
          Your privacy matters to us. This policy explains how StoryVermo collects, uses, and protects your information.
        </p>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">1. Information We Collect</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>
              <span className="font-semibold text-cyan-300">Account Information:</span> When you sign up, we collect your username, email, password, and (optionally) your name, brand name, country, city, gender, bio, and preferred categories.
            </li>
            <li>
              <span className="font-semibold text-cyan-300">Story & Content Data:</span> When you create or edit stories, we collect the story title, description, tags, cover images, verse content, verse images, and contribution settings.
            </li>
            <li>
              <span className="font-semibold text-cyan-300">Contact & Communication:</span> If you contact us via our contact form, we collect your name, email, and message content.
            </li>
            <li>
              <span className="font-semibold text-cyan-300">Usage Data:</span> We collect anonymized data about how you use StoryVermo (e.g., page views, actions, device/browser info) to improve our platform.
            </li>
            <li>
              <span className="font-semibold text-cyan-300">Cookies & Tracking:</span> We use cookies for authentication, session management, and analytics.
            </li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>To create and manage your account.</li>
            <li>To enable you to create, edit, and share stories and verses.</li>
            <li>To personalize your experience and show relevant content.</li>
            <li>To communicate with you about your account, platform updates, or support requests.</li>
            <li>To improve StoryVermo’s features, security, and performance.</li>
            <li>To comply with legal obligations and prevent abuse.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">3. How We Share Your Data</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>We <span className="font-semibold text-cyan-300">do not sell</span> your personal data.</li>
            <li>Your public profile, stories, and verses are visible to other users and visitors.</li>
            <li>We may share data with trusted service providers (e.g., hosting, analytics, email delivery) who help us operate StoryVermo, under strict confidentiality agreements.</li>
            <li>We may disclose information if required by law or to protect StoryVermo and its users.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">4. Data Security</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>We use industry-standard security measures to protect your data.</li>
            <li>Passwords are securely hashed and never stored in plain text.</li>
            <li>We regularly review our security practices and access controls.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">5. Your Rights & Choices</h2>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>You can update your profile and account information at any time.</li>
            <li>You can delete your account by contacting us at <a href="mailto:storyvermo@gmail.com" className="underline text-cyan-300">storyvermo@gmail.com</a>.</li>
            <li>You may opt out of non-essential communications.</li>
            <li>For EU/UK users: You have the right to access, correct, or erase your data, and to object to or restrict certain processing.</li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">6. Children’s Privacy</h2>
          <p className="text-gray-200">StoryVermo is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us and we will promptly delete it.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">7. Changes to This Policy</h2>
          <p className="text-gray-200">We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on StoryVermo or contacting you directly if required.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-3">8. Contact Us</h2>
          <p className="text-gray-200">If you have questions or requests regarding your privacy, please <Link href="/contact" className="underline text-cyan-300">contact us</Link> or email <a href="mailto:storyvermo@gmail.com" className="underline text-cyan-300">storyvermo@gmail.com</a>.</p>
        </section>
        <div className="text-xs text-gray-500 text-center mt-8">
          Last updated: November 27, 2025
        </div>
      </div>
    </div>
  );
}
