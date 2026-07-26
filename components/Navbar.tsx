'use client';

import React, { useState } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import Avatar from '@/components/Avatar';

import { useEffect } from 'react';

interface NavbarProps {
  currentView: string;
  showSearch: boolean;
  searchQuery: string;
  watchLaterCount: number;
  onViewChange: (view: string) => void;
  onSearchToggle: () => void;
  onSearchChange: (query: string) => void;
}

export default function Navbar({
  currentView,
  showSearch,
  searchQuery,
  watchLaterCount,
  onViewChange,
  onSearchToggle,
  onSearchChange
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, profile, isLoading, isSignedIn, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    return null;
  }

  const handleViewChange = (view: string) => {
    onViewChange(view);
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (value) {
      onViewChange('search');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email || 'User';
  const userEmail = user?.email || '';

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-150 ease-out ${
        (isScrolled || showSearch)
          ? 'bg-black/80 backdrop-blur-md border-b border-white/10'
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-full px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Nav */}
          <div className="flex items-center space-x-10">
            <Link 
              href="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  e.preventDefault();
                }
                handleViewChange('home');
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <Image src="/logo.png" alt="Movime" width={40} height={40} />
              <span className="text-2xl font-bold text-white tracking-wide">
                Movime
              </span>
            </Link>

            <nav className="hidden lg:flex space-x-7 ml-8">
              {['home', 'movies', 'tv', 'anime', 'watchlater'].map((view, index) => {
                const active = currentView === view || (currentView === 'watch-sports' && view === 'livesports');
                const label = view === 'watchlater'
                  ? `My List (${watchLaterCount})`
                  : view === 'tv'
                  ? 'TV Shows'
                  : view.charAt(0).toUpperCase() + view.slice(1);
                return (
                  <motion.button
                    key={view}
                    onClick={() => handleViewChange(view)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-0 py-0 text-sm font-medium tracking-wide transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-sm ${
                      active ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative inline-block">
                      {label}
                      <motion.span
                        className="absolute left-0 right-0 -bottom-1 h-[2px] rounded-full origin-center bg-white/70"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: active ? 1 : 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.15 }}
                      />
                    </span>
                  </motion.button>
                );
              })}
            </nav>
          </div>

          {/* Right side icons & user */}
          <div className="flex items-center space-x-5">
            {currentView === 'watch-sports' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white font-medium text-xs uppercase tracking-wide">LIVE</span>
              </div>
            )}
            
            <Link
              href="/search"
              className="p-2 hover:bg-white/10 rounded-full transition-all duration-100 group"
              title="Search"
            >
              <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            <Link
              href="/settings"
              className="p-2 hover:bg-white/10 rounded-full transition-all duration-100 group"
              title="Settings"
            >
              <svg className="w-5 h-5 text-white hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
            
            {/* User Authentication */}
            {isLoading ? (
              <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
            ) : isSignedIn ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="focus:outline-none"
                >
                  <Avatar
                    src={avatarUrl}
                    alt={userName}
                    size={32}
                    fallbackText={userName}
                    className="rounded-full hover:ring-2 hover:ring-white/30 transition-all duration-100"
                  />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 mt-2 w-56 bg-black/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-white/10">
                        <p className="font-medium text-white text-sm truncate">{userName}</p>
                        <p className="text-gray-400 text-xs truncate">{userEmail}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-white/10 py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors w-full text-left"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="px-4 py-1.5 rounded-sm text-black text-sm font-semibold tracking-wide transition-all duration-150 bg-white hover:bg-gray-100 shadow-md focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
