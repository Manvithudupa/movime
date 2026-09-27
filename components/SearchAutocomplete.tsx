'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { searchContent, TMDB_IMAGE_BASE_URL, getLocalStorage, setLocalStorage } from '@/lib/utils'
import { filterRankSearchResults } from '@/lib/searchFilter'
import Image from '@/components/ProxyImage'

const RECENT_SEARCHES_KEY = 'movime_recent_searches'
const MAX_RECENT = 8

const TRENDING_KEYWORDS = [
  'Dune', 'Oppenheimer', 'The Batman', 'John Wick', 'Interstellar',
  'Avengers', 'Spider-Man', 'The Lord of the Rings', 'Inception',
  'Breaking Bad', 'Game of Thrones', 'Stranger Things', 'The Office',
  'Attack on Titan', 'One Piece', 'Demon Slayer', 'Jujutsu Kaisen',
  'Squid Game', 'Money Heist', 'The Walking Dead',
]

interface SearchAutocompleteProps {
  query: string
  onSelect: (suggestion: string) => void
  isFocused: boolean
  onFocusChange: (focused: boolean) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  // "View all results" action. Defaults to navigating to /search?q=…, but
  // callers already on the search page override it so it doesn't re-navigate.
  onViewAll?: (query: string) => void
}

interface AutocompleteSuggestion {
  type: 'recent' | 'trending' | 'live'
  label: string
  id?: number
  mediaType?: string
  posterPath?: string
  year?: string
}

interface RecentSearch {
  label: string
  id?: number
  mediaType?: string
}

export default function SearchAutocomplete({
  query,
  onSelect,
  isFocused,
  onFocusChange,
  inputRef,
  onViewAll,
}: SearchAutocompleteProps) {
  const router = useRouter()
  const [liveSuggestions, setLiveSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage, normalizing legacy string entries
  // saved before recents stored a content id + media type.
  useEffect(() => {
    const stored = getLocalStorage<any[]>(RECENT_SEARCHES_KEY, [])
    const normalized = (Array.isArray(stored) ? stored : [])
      .map((entry): RecentSearch | null => {
        if (typeof entry === 'string') return { label: entry }
        if (entry && typeof entry.label === 'string') {
          return { label: entry.label, id: entry.id, mediaType: entry.mediaType }
        }
        return null
      })
      .filter((entry): entry is RecentSearch => entry !== null)
    setRecentSearches(normalized)
  }, [])

  // Fetch live TMDB suggestions as user types (debounced)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setLiveSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchContent(query)
        // Run the exact same filter/rank pipeline as the full search, so every
        // suggestion here is guaranteed to appear on the results page too.
        const results = filterRankSearchResults<any>(data.results, query).slice(0, 6)
        const suggestions: AutocompleteSuggestion[] = results.map((item) => ({
          type: 'live' as const,
          label: item.title || item.name || '',
          id: item.id,
          mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
          posterPath: item.poster_path,
          year: (item.release_date || item.first_air_date || '').slice(0, 4),
        }))
        setLiveSuggestions(suggestions)
      } catch {
        setLiveSuggestions([])
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  // Show/hide dropdown — always show when focused with content or recent searches
  useEffect(() => {
    const shouldShow = isFocused && (
      query.trim().length >= 2 ||  // user is actively typing
      (query.trim().length === 0 && recentSearches.length > 0)  // empty input with history
    )
    setShowDropdown(shouldShow)
  }, [isFocused, query, recentSearches.length])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        onFocusChange(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputRef, onFocusChange])

  // Build the suggestions list
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const suggestions = useMemo((): AutocompleteSuggestion[] => {
    if (query.trim().length >= 2) {
      // Filtered recent matching query + TMDB live suggestions
      const filteredRecent = recentSearches
        .filter(r => r.label.toLowerCase().includes(query.toLowerCase()) && r.label.toLowerCase() !== query.toLowerCase())
        .slice(0, 3)
        .map(r => ({ type: 'recent' as const, label: r.label, id: r.id, mediaType: r.mediaType }))
      return [...filteredRecent, ...liveSuggestions]
    }

    // Empty query: recent + trending
    const recent = recentSearches.slice(0, 5).map(r => ({ type: 'recent' as const, label: r.label, id: r.id, mediaType: r.mediaType }))
    const trending = TRENDING_KEYWORDS
      .filter(t => !recentSearches.slice(0, 5).some(r => r.label === t))
      .slice(0, 5)
      .map(t => ({ type: 'trending' as const, label: t }))
    return [...recent, ...trending]
  }, [query, recentSearches, liveSuggestions])

  const saveRecentSearch = (label: string, id?: number, mediaType?: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const entry: RecentSearch = { label: trimmed, id, mediaType }
    const updated = [entry, ...recentSearches.filter(r => r.label.toLowerCase() !== trimmed.toLowerCase())]
      .slice(0, MAX_RECENT)
    setRecentSearches(updated)
    setLocalStorage(RECENT_SEARCHES_KEY, updated)
  }

  const handleSelect = (suggestion: string) => {
    saveRecentSearch(suggestion)
    onSelect(suggestion)
    onFocusChange(false)
  }

  // Take the user to the full search page for the whole query.
  const handleViewAll = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    onFocusChange(false)
    inputRef.current?.blur()
    if (onViewAll) {
      onViewAll(trimmed)
      return
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  // Live TMDB suggestions carry an id + media type, so they open the details
  // page directly instead of running a text search.
  const handleSelectLive = (suggestion: AutocompleteSuggestion) => {
    if (suggestion.id == null || !suggestion.mediaType) {
      handleSelect(suggestion.label)
      return
    }
    saveRecentSearch(suggestion.label, suggestion.id, suggestion.mediaType)
    onFocusChange(false)
    inputRef.current?.blur()
    router.push(`/details?id=${suggestion.id}&type=${suggestion.mediaType}`)
  }

  // Recents remember the content they point at, so they reopen its details
  // page; legacy text-only entries fall back to a text search.
  const handleSelectRecent = (recent: RecentSearch) => {
    if (recent.id != null && recent.mediaType) {
      handleSelectLive({
        type: 'recent',
        label: recent.label,
        id: recent.id,
        mediaType: recent.mediaType,
      })
      return
    }
    handleSelect(recent.label)
  }

  const removeRecentSearch = (e: React.MouseEvent, label: string) => {
    e.stopPropagation()
    const updated = recentSearches.filter(r => r.label !== label)
    setRecentSearches(updated)
    setLocalStorage(RECENT_SEARCHES_KEY, updated)
  }

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRecentSearches([])
    setLocalStorage(RECENT_SEARCHES_KEY, [])
  }

  return (
    <AnimatePresence>
      {showDropdown && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ originY: 'top' }}
        >
          <div className="py-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
            {/* Empty query: Recent + Trending */}
            {query.trim().length < 2 && (
              <>
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="px-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Recent</span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    {recentSearches.slice(0, 5).map((recent) => (
                      <div
                        key={`recent-${recent.label}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectRecent(recent)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectRecent(recent);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors rounded-xl text-gray-300 hover:bg-white/5 hover:text-white group cursor-pointer"
                      >
                        <svg className="w-4 h-4 flex-shrink-0 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1 truncate text-left">{recent.label}</span>
                        <button
                          onClick={(e) => removeRecentSearch(e, recent.label)}
                          className="p-1 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${recent.label} from recent searches`}
                        >
                          <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trending pills */}
                <div className="px-2 mt-1">
                  <div className="flex items-center px-3 py-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Trending</span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-3 pb-1">
                    {TRENDING_KEYWORDS.slice(0, 8).map((term) => (
                      <button
                        key={`trend-${term}`}
                        onClick={() => handleSelect(term)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs transition-colors border border-white/5 hover:border-white/20"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Typing: Live TMDB suggestions */}
            {query.trim().length >= 2 && liveSuggestions.length > 0 && (
              <div className="px-2">
                <div className="flex items-center px-3 py-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Suggestions</span>
                </div>
                {liveSuggestions.map((suggestion) => (
                  <button
                    key={`live-${suggestion.id}`}
                    onClick={() => handleSelectLive(suggestion)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors rounded-xl text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    {suggestion.posterPath ? (
                      <div className="relative w-8 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        <Image
                          src={`${TMDB_IMAGE_BASE_URL}${suggestion.posterPath}`}
                          alt={suggestion.label}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-12 rounded-lg flex-shrink-0 bg-white/5 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{suggestion.label}</p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span className="capitalize">{suggestion.mediaType}</span>
                        {suggestion.year && (
                          <>
                            <span>·</span>
                            <span>{suggestion.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 flex-shrink-0 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Searching indicator */}
            {query.trim().length >= 2 && liveSuggestions.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-white/40 text-sm">Searching for &quot;{query}&quot;...</p>
              </div>
            )}

          </div>

          {/* View all results — pinned below the scrolling suggestions so it
              stays visible no matter how many rows the query returns. */}
          {query.trim().length >= 2 && (
            <div className="px-2 py-2 border-t border-white/10 bg-black/40">
              <button
                type="button"
                onClick={handleViewAll}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="truncate">View all results for &quot;{query.trim()}&quot;</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
