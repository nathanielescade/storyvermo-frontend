

'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ContactPage() {

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const response = await fetch('https://formspree.io/f/mleqkadn', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatus('success');
        setForm({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
        setErrorMsg(result?.error || 'Failed to send message.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani px-4 py-12 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <div className="flex justify-center mb-8">
          <Image
            src="/storyvermo_logo.png"
            alt="StoryVermo Logo"
            width={80}
            height={68}
            className="h-16 w-20"
            priority
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
          Contact StoryVermo
        </h1>
        <p className="text-lg text-gray-300 text-center mb-8">
          We love hearing from you! Reach out to us for support, feedback, or just to say hello.
        </p>
        <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-pink-400 mb-2">Send Us a Message</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              required
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              className="px-4 py-2 rounded-lg bg-black/40 border border-pink-400 text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              disabled={status === 'sending'}
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Your Email"
              value={form.email}
              onChange={handleChange}
              className="px-4 py-2 rounded-lg bg-black/40 border border-blue-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={status === 'sending'}
            />
            <textarea
              name="message"
              required
              placeholder="Your Message"
              rows={5}
              value={form.message}
              onChange={handleChange}
              className="px-4 py-2 rounded-lg bg-black/40 border border-purple-400 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={status === 'sending'}
            />
            <button
              type="submit"
              className="mt-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
          {status === 'success' && (
            <div className="mt-4 text-green-400 font-semibold text-center">Thank you! Your message has been sent.</div>
          )}
          {status === 'error' && (
            <div className="mt-4 text-red-400 font-semibold text-center">{errorMsg || 'Failed to send message.'}</div>
          )}
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-pink-400 mb-2">Email</h2>
            <p className="text-gray-200 mb-2">Or email us directly:</p>
            <a href="mailto:storyvermo@gmail.com" className="text-blue-400 font-bold hover:underline">storyvermo@gmail.com</a>
          </div>
        </div>
        <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-purple-900 rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-2">Social Media</h2>
          <p className="text-gray-200 mb-4">Connect with us on your favorite platforms:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="https://pinterest.com/storyvermo" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-pink-600/80 rounded-full hover:scale-105 transition-transform">
              <span className="text-xl">📌</span> <span>Pinterest</span>
            </Link>
            <Link href="https://facebook.com/storyvermo" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 rounded-full hover:scale-105 transition-transform">
              <span className="text-xl">📘</span> <span>Facebook</span>
            </Link>
            <Link href="https://x.com/storyvermo" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 rounded-full hover:scale-105 transition-transform">
              <span className="text-xl">🕊️</span> <span>X (Twitter)</span>
            </Link>
            <Link href="https://instagram.com/storyvermo" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 via-yellow-500 to-purple-500 rounded-full hover:scale-105 transition-transform">
              <span className="text-xl">📸</span> <span>Instagram</span>
            </Link>
            <Link href="https://tiktok.com/@storyvermo" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-black/80 rounded-full hover:scale-105 transition-transform">
              <span className="text-xl">🎵</span> <span>TikTok</span>
            </Link>
          </div>
        </div>
        <div className="text-center mt-8">
          <p className="text-gray-400 text-lg">We&apos;re here for you. Let&apos;s connect and build something beautiful together!</p>
        </div>
      </div>
    </div>
  );
}
