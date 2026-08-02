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

interface WatchlistStore {
  items: WatchlistItem[]
  count: number
  lastFetched: number
  isLoading: boolean
  fetch: (isSignedIn: boolean) => Promise<void>
  add: (item: WatchlistItem) => void
  remove: (contentId: number) => void
  updateStatus: (contentId: number, status: string) => void
  clear: () => void
  isInWatchlist: (contentId: number) => boolean
}

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
      const saved = getLocalStorage('watchLater', [])
      const localItems = saved.map((item: any, i: number) => ({
        id: `local-${i}`,
        content_id: item.id || item.content_id,
        content_type: item.type || item.content_type || 'movie',
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
      const saved = getLocalStorage('watchLater', [])
      const localItems = saved.map((item: any, i: number) => ({
        id: `local-${i}`,
        content_id: item.id || item.content_id,
        content_type: item.type || item.content_type || 'movie',
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
      const exists = state.items.some(i => i.content_id === item.content_id)
      if (exists) {
        // Toggle off if already exists
        const newItems = state.items.filter(i => i.content_id !== item.content_id)
        return { items: newItems, count: newItems.length }
      }
      const newItems = [...state.items, item]
      return { items: newItems, count: newItems.length }
    })
  },

  remove: (contentId) => {
    set((state) => {
      const newItems = state.items.filter(i => i.content_id !== contentId)
      return { items: newItems, count: newItems.length }
    })
  },

  updateStatus: (contentId, status) => {
    set((state) => ({
      items: state.items.map(i => 
        i.content_id === contentId ? { ...i, status } : i
      ),
    }))
  },

  clear: () => {
    set({ items: [], count: 0, lastFetched: 0, isLoading: false })
  },

  isInWatchlist: (contentId) => {
    return get().items.some(i => i.content_id === contentId)
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

interface ContinueWatchingStore {
  items: ContinueWatchingItem[]
  count: number
  lastFetched: number
  isLoading: boolean
  fetch: (isSignedIn: boolean) => Promise<void>
  upsert: (item: Partial<ContinueWatchingItem>, isSignedIn: boolean) => Promise<void>
  remove: (contentId: number, contentType: string, isSignedIn: boolean, seasonNumber?: number, episodeNumber?: number) => Promise<void>
  clear: () => void
}

export const useContinueWatchingStore = create<ContinueWatchingStore>((set, get) => ({
  items: [],
  count: 0,
  lastFetched: 0,
  isLoading: false,

  fetch: async (isSignedIn: boolean) => {
    const state = get()
    const now = Date.now()

    if (state.items.length > 0 && now - state.lastFetched < CONTINUE_WATCHING_CACHE_TTL) {
      return
    }

    if (state.isLoading) return

    set({ isLoading: true })

    try {
      if (isSignedIn) {
        const response = await fetch('/api/continue-watching')
        if (response.ok) {
          const data = await response.json()
          const items = Array.isArray(data) ? data : []
          set({ items, count: items.length, lastFetched: Date.now(), isLoading: false })
          return
        }
      }
      
      // Try localStorage fallback
      const saved = getLocalStorage('continueWatching', [])
      set({ items: saved, count: saved.length, lastFetched: Date.now(), isLoading: false })
    } catch (error) {
      console.error('Error fetching continue watching:', error)
      const saved = getLocalStorage('continueWatching', [])
      set({ items: saved, count: saved.length, lastFetched: Date.now(), isLoading: false })
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
    set({ items: [], count: 0, lastFetched: 0, isLoading: false })
    setLocalStorage('continueWatching', [])
  },
}))
