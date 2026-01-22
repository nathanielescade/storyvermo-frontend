"use client";

import React from "react";

const OnboardingModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[10100] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl max-h-[90vh] bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 rounded-3xl shadow-2xl overflow-hidden transform scale-100 transition-all duration-500 flex flex-col">

        {/* Decorative Borders */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-3xl border-2 border-cyan-500/30 animate-pulse"></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute inset-0 rounded-3xl border-2 border-pink-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Header */}
        <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-b border-cyan-500/30 px-6 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
              Welcome to StoryVermo
            </h2>
            <p className="mt-2 text-sm text-gray-300 max-w-xl">
              StoryVermo is your space to share life’s moments, connect with creators, and bring stories to life through words and images.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-gray-900/60 hover:bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-cyan-500/50"
          >
            <span className="sr-only">Close</span>
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Main Content */}
        <div className="relative z-[10] p-8 overflow-y-auto grow custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {/* Stories */}
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                S
              </div>
              <div className="text-white font-semibold text-lg">Stories</div>
              <p className="text-xs text-gray-400">Full narratives — experiences you share with the world.</p>
            </div>

            {/* Verses */}
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                V
              </div>
              <div className="text-white font-semibold text-lg">Verses</div>
              <p className="text-xs text-gray-400">Bite-sized chapters that build each story step by step.</p>
            </div>

            {/* Moments */}
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-xl font-bold">
                M
              </div>
              <div className="text-white font-semibold text-lg">Moments</div>
              <p className="text-xs text-gray-400">Images or tiny scenes that add life and emotion to your story.</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-300">
              Connect, create, and explore stories with a community of passionate creators.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 bg-gradient-to-r from-gray-950/95 to-indigo-950/95 backdrop-blur-md border-t border-gray-800/50 px-6 py-4 sticky bottom-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all duration-300"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;
