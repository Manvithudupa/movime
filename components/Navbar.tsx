'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import Avatar from '@/components/Avatar';

import BottomNav from '@/components/BottomNav';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { VIEW_ROUTES } from '@/lib/routes';

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
  searchQuery, // eslint-disable-line @typescript-eslint/no-unused-vars
  watchLaterCount,
  onViewChange,
  onSearchToggle // eslint-disable-line @typescript-eslint/no-unused-vars
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, profile, isLoading, isSignedIn, signOut } = useAuth();
  const router = useRouter();

  // Desktop quick-search bar. Live suggestions from SearchAutocomplete go
  // straight to the details page; picking a plain term (trending/recent text)
  // or pressing Enter falls back to the full /search page.
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [navSearchFocused, setNavSearchFocused] = useState(false);
  const navSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  // Close the account dropdown on outside click/tap or Escape — it used to
  // stay open until the avatar was clicked again.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current?.contains(e.target as Node)) return;
      setIsUserMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    return null;
  }

  const handleViewChange = (view: string) => {
    const route = VIEW_ROUTES[view];
    if (route) {
      if (pathname === route) {
        // Already on that page — keep parent state in sync and scroll to top
        onViewChange(view);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        router.push(route);
      }
    } else {
      onViewChange(view);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const handleNavFocusChange = (focused: boolean) => {
    setNavSearchFocused(focused);
    // Clear the quick-search input once it loses focus (selection, outside
    // click, or Escape) so the next open starts fresh.
    if (!focused) setNavSearchQuery('');
  };

  const goToSearchPage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navSearchInputRef.current?.blur();
    setNavSearchFocused(false);
    setNavSearchQuery('');
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleNavSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToSearchPage(navSearchQuery);
    } else if (e.key === 'Escape') {
      navSearchInputRef.current?.blur();
      setNavSearchFocused(false);
      setNavSearchQuery('');
    }
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email || 'User';
  const userEmail = user?.email || '';

  return (
    <>
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
              <Image src="/logo.png" alt="Movime" width={32} height={32} className="sm:w-10 sm:h-10" />
              <span className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                Movime
              </span>
            </Link>

            <nav              className="hidden lg:flex space-x-4 xl:space-x-7 ml-8">
              {['home', 'movies', 'tv', 'anime'].map((view, index) => {
                const active = currentView === view;
                const label = view === 'tv'
                  ? 'TV Shows'
                  : view.charAt(0).toUpperCase() + view.slice(1);
                return (
                  <motion.button
                    key={view}
                    onClick={() => handleViewChange(view)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-0 py-0 text-sm font-medium tracking-wide transition-colors duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-sm ${
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
              {/* Guests only — signed-in users get My List in the profile
                  dropdown. */}
              {!isSignedIn && (
              <Link
                href="/watchlist"
                className={`relative text-sm font-medium tracking-wide transition-colors duration-150 group ${
                  currentView === 'watchlist' ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="relative inline-block">
                  My List ({watchLaterCount})
                  <motion.span
                    className="absolute left-0 right-0 -bottom-1 h-[2px] rounded-full origin-center bg-white/70"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: currentView === 'watchlist' ? 1 : 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.15 }}
                  />
                </span>
              </Link>
              )}
            </nav>
          </div>

          {/* Menu hamburger — hidden on lg+ where the inline nav row shows.
              ml-auto pins it to the right edge: on phones the right-side
              icons/avatar are hidden (the bottom nav covers them), so
              justify-between with an empty third slot used to centre this
              button in the middle of the bar. */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="ml-auto flex lg:hidden p-2 hover:bg-white/10 rounded-full transition-all duration-100 group relative z-50"
            title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <div className="w-5 h-5 flex flex-col items-center justify-center gap-1">
              <motion.span 
                className="block w-5 h-[2px] bg-white rounded-full origin-center"
                animate={isMobileMenuOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span 
                className="block w-5 h-[2px] bg-white rounded-full"
                animate={isMobileMenuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span 
                className="block w-5 h-[2px] bg-white rounded-full origin-center"
                animate={isMobileMenuOpen ? { rotate: -45, y: -4.5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </button>

          {/* Right side icons & user */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Desktop quick-search bar — replaces the old search icon.
                  Suggestions open the details page directly; phones keep the
                  dedicated /search page (bottom nav), so the bar is hidden
                  below sm and on /search itself where the page has its own
                  input. */}
              {pathname !== '/search' && (
                <div className="relative hidden sm:block">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={navSearchInputRef}
                    value={navSearchQuery}
                    onChange={(e) => setNavSearchQuery(e.target.value)}
                    onFocus={() => setNavSearchFocused(true)}
                    onKeyDown={handleNavSearchKeyDown}
                    placeholder="Search"
                    aria-label="Search movies, TV shows and anime"
                    className="w-44 md:w-56 lg:w-64 pl-9 pr-3 py-1.5 rounded-full bg-white/5 border border-white/10 focus:border-white/40 text-sm text-white placeholder-white/40 outline-none transition-colors"
                  />
                  <SearchAutocomplete
                    query={navSearchQuery}
                    onSelect={goToSearchPage}
                    onViewAll={goToSearchPage}
                    isFocused={navSearchFocused}
                    onFocusChange={handleNavFocusChange}
                    inputRef={navSearchInputRef}
                  />
                </div>
              )}

              {/* Guests keep a direct Settings shortcut; signed-in users reach
                  it (and My List) from the profile dropdown instead. */}
              {!isSignedIn && (
              <Link
                href="/settings"
                className="hidden sm:inline-flex p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-all duration-100 group"
                title="Settings"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              )}
            </div>
            
            {/* User Authentication */}
            {isLoading ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 rounded-full animate-pulse"></div>
            ) : isSignedIn ? (
              <div className="relative" ref={userMenuRef}>
                {/* Hidden on phones: the hamburger menu holds the profile
                    entry there, so showing the avatar twice was redundant. It
                    stays visible from sm up, where the dropdown is the only
                    account entry point (incl. sign out). */}
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="hidden sm:inline-flex focus:outline-none"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                >
                  <Avatar
                    src={avatarUrl}
                    alt={userName}
                    size={28}
                    fallbackText={userName}
                    className="rounded-full hover:ring-2 hover:ring-white/30 transition-all duration-100 sm:w-8 sm:h-8"
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
                          href="/watchlist"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          <span className="flex-1">My List</span>
                          {watchLaterCount > 0 && (
                            <span className="bg-white/15 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {watchLaterCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          href="/history"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          History
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
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
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
                className="hidden sm:inline-flex px-3 py-1.5 sm:px-4 rounded-sm text-black text-xs sm:text-sm font-semibold tracking-wide transition-all duration-150 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -20, scaleY: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 left-0 right-0 z-40 pt-20 pb-6 lg:hidden"
              style={{ originY: 'top' }}
            >
              <div className="mx-4 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <nav className="py-3 px-2">
                  {[
                    { view: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                    { view: 'movies', label: 'Movies', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' },
                    { view: 'tv', label: 'TV Shows', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                    { view: 'anime', label: 'Anime', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
                  ].map((item, index) => {
                    const active = currentView === item.view;
                    return (
                      <motion.button
                        key={item.view}
                        onClick={() => {
                          handleViewChange(item.view);
                          setIsMobileMenuOpen(false);
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.04 }}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                          active
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                        <span>{item.label}</span>
                        {active && (
                          <motion.span
                            layoutId="mobileNavIndicator"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                  
                  {/* Divider */}
                  <div className="my-2 mx-4 border-t border-white/5" />
                  
                  {/* My List Link */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.2 }}
                  >
                    <Link
                      href="/watchlist"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        currentView === 'watchlist'
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span>My List</span>
                      {watchLaterCount > 0 && (
                        <span className="ml-auto bg-white/15 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {watchLaterCount}
                        </span>
                      )}
                    </Link>
                  </motion.div>

                  {/* Watch History Link — the account dropdown that holds this
                      on desktop is hidden on phones, so the mobile menu needs
                      its own entry. */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.22 }}
                  >
                    <Link
                      href="/history"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        currentView === 'history'
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>History</span>
                    </Link>
                  </motion.div>

                  {/* Account entry point on phones — the bottom nav used to
                      carry a "You" tab for this, but the bar had too many
                      tabs. Guests get a sign-in link instead of a profile. */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.24 }}
                  >
                    <Link
                      href={isSignedIn ? '/profile' : '/auth/login'}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        currentView === 'profile'
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 bg-white/10 rounded-full animate-pulse flex-shrink-0" />
                      ) : isSignedIn ? (
                        <Avatar
                          src={avatarUrl}
                          alt={userName}
                          size={20}
                          fallbackText={userName}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      <span>{isSignedIn ? 'Profile' : 'Sign In'}</span>
                    </Link>
                  </motion.div>

                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
      {/* Bottom nav spacer — pushes content above the fixed bottom nav on mobile */}
      <div className="h-16 sm:hidden" />
      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </>
  );
}
