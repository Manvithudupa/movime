import { create } from 'zustand';
import { getLocalStorage, setLocalStorage } from './utils';

export interface WatchlistItem {
  id: string | number
  content_id: number
  content_type: 'movie' | 'tv'
  title: string
  poster_path: string | null
  status: string
  added_at: string
  updated_at: string
}

const WATCHLIST_CACHE_TTL = 60 * 1000 // 1 minute before background re-fetch

// localStorage is user-writable and can hold anything, but the stores assume
// arrays. A non-array value used to throw inside the first .map(), and in the
// watchlist fetch the catch block threw again with the same value — leaving
// `isLoading` stuck true, which made every later fetch() a no-op for the rest
// of the session. Always read lists through this guard.
const readLocalList = <T,>(key: string): T[] => {
  const stored = getLocalStorage<unknown>(key, [])
  return Array.isArray(stored) ? (stored as T[]) : []
}

interface WatchlistStore {
  items: WatchlistItem[]
  count: number
  lastFetched: number
  isLoading: boolean
  fetch: (isSignedIn: boolean) => Promise<void>
  add: (item: WatchlistItem) => void
  toggle: (item: WatchlistItem) => void
  remove: (contentId: number, contentType?: 'movie' | 'tv') => void
  updateStatus: (contentId: number, status: string, contentType?: 'movie' | 'tv') => void
  clear: () => void
  isInWatchlist: (contentId: number, contentType?: 'movie' | 'tv') => boolean
}

// TMDB shares its numeric id space between movies and TV, so content_id alone
// is NOT a unique key — a movie and a show can carry the same id. The database
// keys a row on (user_id, content_id, content_type); every matcher mirrors
// that. contentType is optional so legacy callers keep working, but passing it
// is what prevents a same-id movie/TV pair from colliding.
const matchesItem = (
  item: WatchlistItem,
  contentId: number,
  contentType?: 'movie' | 'tv'
): boolean =>
  item.content_id === contentId &&
  (contentType === undefined || item.content_type === contentType)

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
  items: [],
  count: 0,
  lastFetched: 0,
  isLoading: false,

  fetch: async (isSignedIn: boolean) => {
    const state = get()
    const now = Date.now()

    // If cached data is fresh enough, skip fetch
    if (state.items.length > 0 && now - state.lastFetched < WATCHLIST_CACHE_TTL) {
      return
    }

    // If already loading, don't double-fetch
    if (state.isLoading) return

    set({ isLoading: true })

    try {
      if (isSignedIn) {
        const response = await fetch('/api/watchlist')
        if (response.ok) {
          const data = await response.json()
          const items = Array.isArray(data) ? data : []
          set({ items, count: items.length, lastFetched: Date.now(), isLoading: false })
          return
        }
      }

      // Fallback to localStorage
      const saved = readLocalList<any>('watchLater')
      const localItems = saved.map((item: any, i: number) => ({
        id: `local-${i}`,
        content_id: item.id || item.content_id,
        // 'movie' was a blanket default that surfaced type-less TV entries as
        // movies everywhere. Derive it the way the content components do
        // (TMDB uses `title` for movies, `name` for TV).
        content_type:
          item.type || item.content_type || (item.title ? 'movie' : 'tv'),
        title: item.title || '',
        poster_path: item.poster || item.poster_path || null,
        status: item.status || 'plan_to_watch',
        added_at: item.addedAt || item.added_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      }))
      set({ items: localItems, count: localItems.length, lastFetched: Date.now(), isLoading: false })
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      // Try localStorage as last resort
      const saved = readLocalList<any>('watchLater')
      const localItems = saved.map((item: any, i: number) => ({
        id: `local-${i}`,
        content_id: item.id || item.content_id,
        // 'movie' was a blanket default that surfaced type-less TV entries as
        // movies everywhere. Derive it the way the content components do
        // (TMDB uses `title` for movies, `name` for TV).
        content_type:
          item.type || item.content_type || (item.title ? 'movie' : 'tv'),
        title: item.title || '',
        poster_path: item.poster || item.poster_path || null,
        status: item.status || 'plan_to_watch',
        added_at: item.addedAt || item.added_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      }))
      set({ items: localItems, count: localItems.length, lastFetched: Date.now(), isLoading: false })
    }
  },

  add: (item) => {
    set((state) => {
      if (state.items.some(i => matchesItem(i, item.content_id, item.content_type))) {
        // Replace the matching entry with the new data
        const newItems = state.items.map(i =>
          matchesItem(i, item.content_id, item.content_type) ? { ...i, ...item } : i
        )
        return { items: newItems, count: newItems.length }
      }
      const newItems = [...state.items, item]
      return { items: newItems, count: newItems.length }
    })
  },

  // Toggle: add if absent, remove if present
  toggle: (item) => {
    set((state) => {
      if (state.items.some(i => matchesItem(i, item.content_id, item.content_type))) {
        const newItems = state.items.filter(
          i => !matchesItem(i, item.content_id, item.content_type)
        )
        return { items: newItems, count: newItems.length }
      }
      const newItems = [...state.items, item]
      return { items: newItems, count: newItems.length }
    })
  },

  remove: (contentId, contentType) => {
    set((state) => {
      const newItems = state.items.filter(i => !matchesItem(i, contentId, contentType))
      return { items: newItems, count: newItems.length }
    })
  },

  updateStatus: (contentId, status, contentType) => {
    set((state) => ({
      items: state.items.map(i =>
        matchesItem(i, contentId, contentType) ? { ...i, status } : i
      ),
    }))
  },

  clear: () => {
    set({ items: [], count: 0, lastFetched: 0, isLoading: false })
  },

  isInWatchlist: (contentId, contentType) => {
    return get().items.some(i => matchesItem(i, contentId, contentType))
  },
}))

// ============================================================
// Continue Watching Store
// ============================================================

export interface ContinueWatchingItem {
  id: string | number
  content_id: number
  content_type: 'movie' | 'tv'
  title: string
  poster_path: string | null
  backdrop_path: string | null
  season_number: number | null
  episode_number: number | null
  episode_title: string | null
  progress_seconds: number
  duration_seconds: number
  progress_percentage: number
  is_completed: boolean
  updated_at: string
}

const CONTINUE_WATCHING_CACHE_TTL = 30 * 1000 // 30 seconds cache

// The home row only needs the most recent handful, while the history page
// wants the whole list. Both go through the same endpoint, so the requested
// size travels with the fetch and is remembered for cache decisions.
export const CONTINUE_WATCHING_DEFAULT_LIMIT = 20
export const CONTINUE_WATCHING_HISTORY_LIMIT = 200

interface ContinueWatchingStore {
  items: ContinueWatchingItem[]
  count: number
  lastFetched: number
  lastLimit: number
  isLoading: boolean
  fetch: (isSignedIn: boolean, limit?: number) => Promise<void>
  upsert: (item: Partial<ContinueWatchingItem>, isSignedIn: boolean) => Promise<void>
  remove: (contentId: number, contentType: string, isSignedIn: boolean, seasonNumber?: number, episodeNumber?: number) => Promise<void>
  clear: () => void
}

// Tracks the continue-watching request currently on the wire (and how many
// rows it asked for) so a larger request — the history page — can wait for a
// smaller one (the home row) instead of being dropped by the isLoading guard
// and leaving the page with a truncated list.
let continueWatchingInFlight: Promise<void> | null = null
let continueWatchingInFlightLimit = 0

export const useContinueWatchingStore = create<ContinueWatchingStore>((set, get) => ({
  items: [],
  count: 0,
  lastFetched: 0,
  lastLimit: 0,
  isLoading: false,

  fetch: async (isSignedIn: boolean, limit: number = CONTINUE_WATCHING_DEFAULT_LIMIT) => {
    const state = get()
    const now = Date.now()

    // Skip only when the cache is fresh AND was filled with at least as many
    // rows as this caller asked for — otherwise the home row's 20-item cache
    // would make the history page (larger limit) silently show a truncated list.
    if (
      state.items.length > 0 &&
      now - state.lastFetched < CONTINUE_WATCHING_CACHE_TTL &&
      state.lastLimit >= limit
    ) {
      return
    }

    if (continueWatchingInFlight) {
      if (continueWatchingInFlightLimit >= limit) return
      // Wait out the smaller request, then run this one so the fuller result wins.
      await continueWatchingInFlight
    }

    set({ isLoading: true })

    const request = (async () => {
      try {
        if (isSignedIn) {
          const response = await fetch(`/api/continue-watching?limit=${limit}`)
          if (response.ok) {
            const data = await response.json()
            const items = Array.isArray(data) ? data : []
            set({ items, count: items.length, lastFetched: Date.now(), lastLimit: limit, isLoading: false })
            return
          }
        }

        // Try localStorage fallback
        const saved = readLocalList<ContinueWatchingItem>('continueWatching')
        set({ items: saved, count: saved.length, lastFetched: Date.now(), lastLimit: limit, isLoading: false })
      } catch (error) {
        console.error('Error fetching continue watching:', error)
        const saved = readLocalList<ContinueWatchingItem>('continueWatching')
        set({ items: saved, count: saved.length, lastFetched: Date.now(), lastLimit: limit, isLoading: false })
      }
    })()

    continueWatchingInFlight = request
    continueWatchingInFlightLimit = limit
    try {
      await request
    } finally {
      if (continueWatchingInFlight === request) {
        continueWatchingInFlight = null
        continueWatchingInFlightLimit = 0
      }
    }
  },

  upsert: async (item, isSignedIn) => {
    // Optimistic update — one entry per show/movie. Match by content id + type
    // only so switching to another episode updates the same continue-watching
    // card instead of creating a new one.
    const currentItems = get().items
    const existingIndex = currentItems.findIndex(
      i => i.content_id === item.content_id && 
           i.content_type === item.content_type
    )

    let updatedItems: ContinueWatchingItem[]
    if (existingIndex >= 0) {
      // Update the existing entry and drop any other stale entries for the same
      // show/movie (legacy duplicates from the old per-episode behavior). The
      // sort below re-orders by recency anyway, so position doesn't matter.
      const existingItem = currentItems[existingIndex]
      updatedItems = currentItems.filter(
        (i) => !(i.content_id === item.content_id && i.content_type === item.content_type)
      )
      updatedItems.unshift({
        ...existingItem,
        ...item,
        updated_at: new Date().toISOString(),
      } as ContinueWatchingItem)
    } else {
      const newItem: ContinueWatchingItem = {
        id: `local-${Date.now()}`,
        content_id: item.content_id!,
        content_type: item.content_type as 'movie' | 'tv',
        title: item.title || '',
        poster_path: item.poster_path || null,
        backdrop_path: item.backdrop_path || null,
        season_number: item.season_number || null,
        episode_number: item.episode_number || null,
        episode_title: item.episode_title || null,
        progress_seconds: item.progress_seconds || 0,
        duration_seconds: item.duration_seconds || 0,
        progress_percentage: item.progress_percentage || 0,
        is_completed: item.is_completed || false,
        updated_at: new Date().toISOString(),
      }
      updatedItems = [newItem, ...currentItems]
    }

    // Sort by updated_at descending
    updatedItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    set({ items: updatedItems, count: updatedItems.length })

    // Save to localStorage as fallback
    setLocalStorage('continueWatching', updatedItems)

    // Try to sync with server (skip for guests — localStorage is their store)
    if (!isSignedIn) return
    try {
      const response = await fetch('/api/continue-watching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (response.ok) {
        const result = await response.json()
        if (result.item) {
          // Replace optimistic entry with server response — one entry per show/movie
          const syncedItems = get().items.map(i => 
            i.content_id === result.item.content_id && 
            i.content_type === result.item.content_type
              ? { ...result.item, id: result.item.id }
              : i
          )
          set({ items: syncedItems })
          // Keep localStorage mirror in sync with the server response
          setLocalStorage('continueWatching', syncedItems)
        }
      }
    } catch (error) {
      // Silently fail - localStorage fallback is available
      console.error('Error syncing continue watching:', error)
    }
  },

  remove: async (contentId, contentType, isSignedIn, seasonNumber, episodeNumber) => {
    const newItems = get().items.filter(i => 
      !(i.content_id === contentId && 
        i.content_type === contentType &&
        (seasonNumber === undefined || i.season_number === seasonNumber) &&
        (episodeNumber === undefined || i.episode_number === episodeNumber))
    )
    set({ items: newItems, count: newItems.length })
    // Persist to localStorage too — otherwise guests (who skip the server
    // DELETE below) would see dismissed items reappear after a page reload.
    setLocalStorage('continueWatching', newItems)

    // Skip server sync for guests — localStorage is their store
    if (!isSignedIn) return

    const params = new URLSearchParams({ content_id: String(contentId), content_type: contentType })
    if (seasonNumber !== undefined) params.set('season_number', String(seasonNumber))
    if (episodeNumber !== undefined) params.set('episode_number', String(episodeNumber))

    try {
      await fetch(`/api/continue-watching?${params}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Error removing continue watching:', error)
    }
  },

  clear: () => {
    set({ items: [], count: 0, lastFetched: 0, lastLimit: 0, isLoading: false })
    setLocalStorage('continueWatching', [])
  },
}))
