'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from '@/components/ProxyImage'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { TMDB_IMAGE_BASE_URL } from '@/lib/utils'
import { getViewPath } from '@/lib/routes'
import {
  useWatchlistStore,
  useContinueWatchingStore,
  CONTINUE_WATCHING_HISTORY_LIMIT,
  type ContinueWatchingItem,
} from '@/lib/store'
import { formatRelativeTime, groupHistoryByDay } from '@/lib/history'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
  { value: 'completed', label: 'Completed' },
] as const

type HistoryFilter = typeof FILTERS[number]['value']

const EMPTY_MESSAGES: Record<HistoryFilter, string> = {
  all: 'No watch history yet',
  movie: 'No movies in your history',
  tv: 'No TV shows in your history',
  completed: 'Nothing finished yet',
}

// A continue-watching row stores only the path TMDB returned, but guests wrote
// fully-qualified URLs into localStorage — handle both.
function getPosterSrc(item: ContinueWatchingItem): string | null {
  if (!item.poster_path) return null
  return item.poster_path.startsWith('http')
    ? item.poster_path
    : `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
}

function getWatchHref(item: ContinueWatchingItem): string {
  return item.content_type === 'tv'
    ? `/watch?id=${item.content_id}&type=tv&season=${item.season_number || 1}&episode=${item.episode_number || 1}`
    : `/watch?id=${item.content_id}&type=movie`
}

function HistoryRow({ item, index, onRemove }: {
  item: ContinueWatchingItem
  index: number
  onRemove: (item: ContinueWatchingItem) => void
}) {
  const posterSrc = getPosterSrc(item)
  const href = getWatchHref(item)
  const percent = Number.isFinite(item.progress_percentage)
    ? Math.min(Math.max(item.progress_percentage, 0), 100)
    : 0
  const isFinished = item.is_completed || percent >= 95

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="group flex gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
    >
      <Link
        href={href}
        className="relative flex-shrink-0 w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-white/5"
      >
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No Image
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white" style={{ width: `${percent}%` }} />
        </div>
      </Link>

      <div className="flex flex-col justify-center min-w-0 flex-1">
        <Link href={href}>
          <h3 className="font-medium text-sm sm:text-base line-clamp-1 group-hover:text-white transition-colors">
            {item.title}
          </h3>
        </Link>
        {item.content_type === 'tv' && item.episode_number && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
            S{item.season_number || 1} · E{item.episode_number}
            {item.episode_title && ` · ${item.episode_title}`}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
          <span>{formatRelativeTime(item.updated_at)}</span>
          <span className="text-muted-foreground">•</span>
          <span className="uppercase tracking-wider">{item.content_type}</span>
          {percent > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span>{isFinished ? 'Finished' : `${percent}% watched`}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 self-center">
        <Link
          href={href}
          className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
        >
          {isFinished ? 'Watch Again' : 'Resume'}
        </Link>
        <button
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.title} from history`}
          title="Remove from history"
          className="p-2 rounded-md bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

function RowSkeleton() {
  return (
    <div className="flex gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex-shrink-0 w-20 sm:w-24 aspect-[2/3] rounded-lg skeleton-shimmer" />
      <div className="flex flex-col justify-center gap-2 flex-1">
        <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        <div className="h-3 w-1/3 rounded skeleton-shimmer" />
        <div className="h-3 w-1/4 rounded skeleton-shimmer" />
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [showSearch] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const items = useContinueWatchingStore((s) => s.items)
  const fetchContinueWatching = useContinueWatchingStore((s) => s.fetch)
  const removeContinueWatching = useContinueWatchingStore((s) => s.remove)
  const watchLaterCount = useWatchlistStore((s) => s.count)
  const fetchWatchlist = useWatchlistStore((s) => s.fetch)

  const handleViewChange = (view: string) => router.push(getViewPath(view))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Ask for the full history window — the home row caches only the latest few.
    Promise.all([
      fetchContinueWatching(!!isSignedIn, CONTINUE_WATCHING_HISTORY_LIMIT),
      fetchWatchlist(!!isSignedIn),
    ]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isSignedIn, fetchContinueWatching, fetchWatchlist])

  const handleRemove = async (item: ContinueWatchingItem) => {
    // Removes from the store, localStorage, and the server in one call, so the
    // home row's Continue Watching section stays in sync too.
    await removeContinueWatching(
      item.content_id,
      item.content_type,
      !!isSignedIn,
      item.season_number ?? undefined,
      item.episode_number ?? undefined
    )
    setMessage('Removed from history')
    setTimeout(() => setMessage(null), 2500)
  }

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'movie':
        return items.filter((i) => i.content_type === 'movie')
      case 'tv':
        return items.filter((i) => i.content_type === 'tv')
      case 'completed':
        return items.filter((i) => i.is_completed)
      default:
        return items
    }
  }, [items, filter])

  const counts = useMemo(() => ({
    all: items.length,
    movie: items.filter((i) => i.content_type === 'movie').length,
    tv: items.filter((i) => i.content_type === 'tv').length,
    completed: items.filter((i) => i.is_completed).length,
  }), [items])

  const groups = useMemo(() => groupHistoryByDay(filteredItems), [filteredItems])

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView="history"
        showSearch={showSearch}
        watchLaterCount={watchLaterCount}
        onViewChange={handleViewChange}
      />

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-4 z-50 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-sm shadow-2xl"
          >
            <span className="text-gray-200">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content" className="pt-28 pb-20 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Watch History</h1>
              <p className="text-gray-400 text-sm mt-1">
                {items.length} title{items.length !== 1 ? 's' : ''} watched
              </p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all text-sm"
            >
              Browse Content
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === value
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {label} <span className="opacity-60">({counts[value]})</span>
              </button>
            ))}
          </div>
        </motion.div>

        {loading && (
          <div aria-hidden="true" className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-6">🕓</div>
            <h2 className="text-2xl font-bold mb-2">
              {EMPTY_MESSAGES[filter]}
            </h2>
            <p className="text-gray-400 mb-8">
              {filter === 'all'
                ? 'Movies and shows you start watching show up here.'
                : 'Try a different filter to see the rest of your history.'}
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all inline-flex items-center gap-2"
            >
              Browse Content
            </Link>
          </motion.div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                  {group.label}
                  <span className="ml-2 text-muted-foreground">{group.items.length}</span>
                </h2>
                <div className="space-y-3">
                  {group.items.map((item, index) => (
                    <HistoryRow
                      key={`${item.content_id}-${item.content_type}`}
                      item={item}
                      index={index}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <p className="text-center text-gray-500 text-xs mt-10">
            {isSignedIn
              ? 'Your history is synced across devices.'
              : 'Sign in to sync your history across devices.'}
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}
