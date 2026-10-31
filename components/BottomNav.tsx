'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useWatchlistStore } from '@/lib/store'

export default function BottomNav() {
  const pathname = usePathname()
  const watchLaterCount = useWatchlistStore((s) => s.count)

  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const navItems = [
    {
      label: 'Home',
      href: '/',
      onClick: handleHomeClick,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      isActive: pathname === '/',
    },
    {
      label: 'Search',
      href: '/search',
      icon: (_active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      isActive: pathname === '/search',
    },
    {
      label: 'Movies',
      href: '/movies',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
      isActive: pathname === '/movies',
    },
    {
      label: 'TV Shows',
      href: '/tv',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      isActive: pathname === '/tv',
    },
    {
      label: 'Anime',
      href: '/anime',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      isActive: pathname === '/anime',
    },
    {
      label: 'My List',
      href: '/watchlist',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      isActive: pathname === '/watchlist',
      badge: watchLaterCount,
    },
    // Profile deliberately lives in the top hamburger menu instead of here —
    // the bar was carrying seven tabs on a phone. See the mobile menu in
    // components/Navbar.tsx.
  ]

  return (
    <motion.nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Safe area spacer for modern phones */}
      <div className="bg-black/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {navItems.map((item) => {
            const active = item.isActive
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-0.5 min-w-0 px-1 py-1 rounded-xl transition-all duration-150 group"
              >
                <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-white/50 group-hover:text-white/80'
                }`}>
                  {item.icon(active)}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-white text-black text-xs font-bold rounded-full px-1 shadow-lg">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-muted-foreground group-hover:text-white/60'
                }`}>
                  {item.label}
                </span>
                {/* Active tab indicator.
                    Centred with `left-0 right-0 mx-auto` rather than
                    `left-1/2 -translate-x-1/2`. The shared layout animation
                    performs its animation by writing an inline `transform`,
                    which overwrites a CSS-applied transform — so the
                    `-translate-x-1/2` was clobbered and the bar sat half its
                    own width (12px) right of the icon it was marking. Auto
                    margins centre it without touching `transform`, so the
                    measurement stays accurate. */}
                {active && (
                  <motion.div
                    layoutId="bottomNavActiveTab"
                    className="absolute -top-0.5 left-0 right-0 mx-auto w-6 h-0.5 rounded-full bg-white"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </motion.nav>
  )
}
