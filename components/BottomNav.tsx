'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/AuthProvider'
import { useWatchlistStore } from '@/lib/store'
import Avatar from '@/components/Avatar'

function BottomNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, profile, isSignedIn, isLoading } = useAuth()
  const watchLaterCount = useWatchlistStore((s) => s.count)

  const currentView = searchParams.get('view') || null

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email || 'U'

  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === '/' && (!currentView || currentView === 'home')) {
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
      isActive: pathname === '/' && (!currentView || currentView === 'home'),
    },
    {
      label: 'Search',
      href: '/search',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      isActive: pathname === '/search',
    },
    {
      label: 'Movies',
      href: '/?view=movies',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
      isActive: pathname === '/' && currentView === 'movies',
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
    {
      label: 'You',
      href: isSignedIn ? '/profile' : '/auth/login',
      icon: (active: boolean) => (
        <div className="relative">
          {isLoading ? (
            <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse" />
          ) : isSignedIn ? (
            <Avatar
              src={avatarUrl}
              alt={userName}
              size={24}
              fallbackText={userName}
              className={`rounded-full border-2 transition-all duration-200 ${
                active ? 'border-white' : 'border-transparent'
              }`}
            />
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
      ),
      isActive: pathname === '/profile' || pathname === '/settings',
    },
  ]

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Safe area spacer for modern phones */}
      <div className="bg-black/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {navItems.map((item) => {
            const active = item.isActive
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={item.onClick}
                className="relative flex flex-col items-center gap-0.5 min-w-0 px-2 py-1 rounded-xl transition-all duration-150 group"
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-white/50 group-hover:text-white/80'
                }`}>
                  {item.icon(active)}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-white text-black text-[10px] font-bold rounded-full px-1 shadow-lg">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-white/40 group-hover:text-white/60'
                }`}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomNavActiveTab"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white"
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

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  )
}
