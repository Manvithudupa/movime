'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from '@/components/ProxyImage'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { TMDB_IMAGE_BASE_URL, getLocalStorage, setLocalStorage } from '@/lib/utils'
import { useWatchlistStore } from '@/lib/store'

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Watching', icon: '▶' },
  { value: 'completed', label: 'Completed', icon: '✓' },
  { value: 'plan_to_watch', label: 'Plan to Watch', icon: '⏳' },
  { value: 'dropped', label: 'Dropped', icon: '✕' },
] as const

type WatchStatus = typeof STATUS_OPTIONS[number]['value']

export default function WatchlistPage() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<WatchStatus | 'all'>('all')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const storeItems = useWatchlistStore((s) => s.items)
  const watchLaterCount = useWatchlistStore((s) => s.count)
  const fetchWatchlist = useWatchlistStore((s) => s.fetch)
  const removeItemFromStore = useWatchlistStore((s) => s.remove)
  const updateStatusInStore = useWatchlistStore((s) => s.updateStatus)
  const [message, setMessage] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Derive display items directly from store - stays in sync across all pages automatically
  const items: (typeof storeItems[number] & { _source: 'api' | 'local'; status: WatchStatus })[] = useMemo(() => 
    storeItems.map(item => ({
      ...item,
      _source: String(item.id).startsWith('local-') ? 'local' as const : 'api' as const,
      status: (item.status as WatchStatus) || 'plan_to_watch',
    })),
  [storeItems])

  const handleSearchToggle = () => setShowSearch(!showSearch)
  const handleSearchChange = (query: string) => setSearchQuery(query)
  const handleViewChange = (view: string) => router.push(`/?view=${view}`)

  useEffect(() => {
    setLoading(true)
    fetchWatchlist(!!isSignedIn).then(() => setLoading(false))
  }, [isSignedIn, fetchWatchlist])

  const removeItem = async (item: typeof items[number]) => {
    try {
      if (item._source === 'api' && isSignedIn) {
        const response = await fetch(
          `/api/watchlist?content_id=${item.content_id}&content_type=${item.content_type}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          removeItemFromStore(item.content_id)
          setMessage('Removed from watchlist')
        } else {
          const err = await response.json()
          setMessage(err.error || 'Failed to remove')
        }
      } else {
        const saved = getLocalStorage('watchLater', [])
        const updated = saved.filter((i: any) => i.id !== item.content_id && i.content_id !== item.content_id)
        setLocalStorage('watchLater', updated)
        removeItemFromStore(item.content_id)
        setMessage('Removed from watchlist')
      }
    } catch (error) {
      console.error('Error removing item:', error)
      setMessage('Failed to remove item')
    }
    setTimeout(() => setMessage(null), 2500)
  }

  const updateStatus = async (item: typeof items[number], newStatus: WatchStatus) => {
    updateStatusInStore(item.content_id, newStatus)
    
    try {
      if (item._source === 'api' && isSignedIn) {
        const response = await fetch('/api/watchlist', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_id: item.content_id,
            content_type: item.content_type,
            status: newStatus,
          }),
        })
        if (response.ok) {
          setMessage(`Status changed to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`)
        } else {
          const err = await response.json()
          setMessage(err.error || 'Failed to update status')
        }
      } else {
        const saved = getLocalStorage('watchLater', [])
        const updated = saved.map((i: any) => 
          i.id === item.content_id ? { ...i, status: newStatus } : i
        )
        setLocalStorage('watchLater', updated)
        setMessage(`Status changed to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setMessage('Failed to update status')
    }
    setTimeout(() => setMessage(null), 2500)
  }

  const filteredItems = filter === 'all' ? items : items.filter(i => i.status === filter)
  const statusCounts = {
    all: items.length,
    watching: items.filter(i => i.status === 'watching').length,
    completed: items.filter(i => i.status === 'completed').length,
    plan_to_watch: items.filter(i => i.status === 'plan_to_watch').length,
    dropped: items.filter(i => i.status === 'dropped').length,
  }

  const getStatusStyle = (status: WatchStatus) => {
    switch (status) {
      case 'watching': return 'bg-white text-black'
      case 'completed': return 'bg-white/70 text-black'
      case 'plan_to_watch': return 'bg-white/30 text-black'
      case 'dropped': return 'bg-white/10 text-black'
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView="watchlist"
        showSearch={showSearch}
        searchQuery={searchQuery}
        watchLaterCount={watchLaterCount}
        onViewChange={handleViewChange}
        onSearchToggle={handleSearchToggle}
        onSearchChange={handleSearchChange}
      />

      {/* Toast notification */}
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

      <main className="pt-28 pb-20 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">My Watchlist</h1>
              <p className="text-gray-400 text-sm mt-1">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Browse Content
            </Link>
          </div>

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            {STATUS_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filter === value
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {icon} {label}
                <span className="opacity-60">({statusCounts[value]})</span>
              </button>
            ))}
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              All ({statusCounts.all})
            </button>
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-white/5 rounded-lg mb-2" />
                <div className="h-4 bg-white/5 rounded w-3/4 mb-1" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-6">📋</div>
            <h2 className="text-2xl font-bold mb-2">
              {filter === 'all' ? 'Your watchlist is empty' : `No ${STATUS_OPTIONS.find(s => s.value === filter)?.label} items`}
            </h2>
            <p className="text-gray-400 mb-8">
              {filter === 'all'
                ? 'Start adding movies and shows to keep track of what you want to watch.'
                : `You don't have any items marked as "${STATUS_OPTIONS.find(s => s.value === filter)?.label}".`}
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Content
            </Link>
          </motion.div>
        )}

        {/* Watchlist grid */}
        {!loading && filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
          >
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id || `${item.content_id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative bg-white/[0.03] border border-white/5 rounded-lg"
              >
                {/* Poster */}
                <Link href={`/details?id=${item.content_id}&type=${item.content_type}`}>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
                    {item.poster_path ? (
                      <Image
                        src={
                          item._source === 'api'
                            ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
                            : item.poster_path
                        }
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 144px, 192px"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No Image</span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusStyle(item.status)}`}>
                      {STATUS_OPTIONS.find(s => s.value === item.status)?.icon}{' '}
                      {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                    </div>
                  </div>
                </Link>

                {/* Hover actions - outside overflow-hidden so status dropdown is not clipped */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="flex flex-col gap-1.5 pointer-events-auto">
                    <Link
                      href={`/watch?id=${item.content_id}&type=${item.content_type}`}
                      className="w-full px-3 py-1.5 bg-white text-black text-xs font-bold rounded-md hover:bg-gray-100 transition-colors text-center flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l7-5z" />
                      </svg>
                      WATCH
                    </Link>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setOpenDropdownId(openDropdownId === String(item.id) ? null : String(item.id))
                        }}
                        onBlur={() => setTimeout(() => setOpenDropdownId(null), 200)}
                        className="w-full px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-md hover:bg-white/30 transition-colors border border-white/20 flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        Status
                      </button>
                      {openDropdownId === String(item.id) && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 z-50">
                          <div className="bg-black border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  updateStatus(item, opt.value)
                                  setOpenDropdownId(null)
                                }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                                  item.status === opt.value
                                    ? 'bg-white/20 text-white'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span>{opt.icon}</span>
                                <span>{opt.label}</span>
                                {item.status === opt.value && (
                                  <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                            {/* Divider */}
                            <div className="border-t border-white/10" />
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault()
                                removeItem(item)
                                setOpenDropdownId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 text-red-400 hover:bg-white/10 hover:text-red-300"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(item)
                      }}
                      className="w-full px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs rounded-md transition-colors border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>

                {/* Title below poster */}
                <div className="p-2.5">
                  <Link href={`/details?id=${item.content_id}&type=${item.content_type}`}>
                    <h3 className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {item.content_type}
                    </span>
                    <span className="text-[10px] text-gray-600">•</span>
                    <span className="text-[10px] text-gray-500">
                      {item.added_at ? new Date(item.added_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Footer hint */}
        {!loading && items.length > 0 && (
          <p className="text-center text-gray-500 text-xs mt-10">
            {isSignedIn
              ? 'Your watchlist is synced across devices.'
              : 'Sign in to sync your watchlist across devices.'}
          </p>
        )}
      </main>
      <Footer />
    </div>
  )
}
