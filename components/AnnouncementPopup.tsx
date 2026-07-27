'use client';

import React, { useEffect, useState } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'movime_announcement_seen_v2';

export default function AnnouncementPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Small delay so the page loads first, then popup appears
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
                boxShadow: '0 0 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle top glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                }}
              />

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition-all duration-200 text-white/50 hover:text-white/90 z-10"
                aria-label="Close announcement"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="px-8 pt-10 pb-8">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                  <Image
                    src="/logo.png"
                    alt="Movime"
                    width={80}
                    height={80}
                    className="object-contain mb-4"
                  />
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                    Welcome to Movime
                  </h1>
                  <span
                    className="mt-3 inline-block px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-widest rounded-full border border-white/[0.15]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    What&rsquo;s New
                  </span>
                  <div className="mt-3 w-12 h-[2px] rounded-full bg-white/20" />
                </div>

                {/* Message sections */}
                <div className="space-y-5 text-sm sm:text-base text-gray-300 leading-relaxed">
                  <p className="text-center text-gray-400 font-light italic">
                    Your destination for seamless streaming.
                  </p>

                  {/* Feature highlights */}
                  <div className="space-y-3 bg-white/[0.02] rounded-xl p-5 border border-white/[0.04]">
                    <FeatureItem
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      }
                      text="Create your profile and choose from hundreds of anime avatars."
                    />

                    <FeatureItem
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      }
                      text="Build your personal watchlist and never lose track of what to watch next."
                    />

                    <FeatureItem
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      }
                      text="Pick up right where you left off with the new continue watching feature."
                    />
                  </div>

                  {/* Share & recommend - prominent */}
                  <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] text-center">
                    <svg className="w-5 h-5 mx-auto mb-2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <p className="text-gray-200 text-sm font-medium">
                      Share Movime with your friends and family
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Recommend the site and help us grow the community.
                    </p>
                  </div>

                  {/* Apology message */}
                  <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.04]">
                    <p className="text-gray-400 text-center text-sm leading-relaxed">
                      We sincerely apologize. Due to a database migration, we had to clear all
                      previous user data. We understand this is inconvenient, and we are truly sorry
                      for the disruption.
                    </p>
                  </div>

                  {/* CTA section */}
                  <div className="text-center space-y-3">
                    <p className="text-gray-200 font-medium">
                      We encourage you to register and create a new account.
                    </p>
                    <p className="text-gray-500 text-sm">
                      Many more exciting features are on the way.
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/auth/signup"
                    onClick={handleDismiss}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wide hover:bg-gray-100 transition-all duration-200 text-center"
                  >
                    Create Account
                  </Link>
                  <button
                    onClick={handleDismiss}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/[0.12] text-white/70 text-sm font-medium hover:text-white hover:border-white/[0.25] transition-all duration-200 text-center"
                  >
                    Continue Browsing
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-white/60 flex-shrink-0">
        {icon}
      </span>
      <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
