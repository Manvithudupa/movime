import { create } from 'zustand';
import { getLocalStorage, setLocalStorage } from './utils';

// Store for anime title preferences (romaji, english, etc.)
interface TitleStore {
  animetitle: 'romaji' | 'english' | 'native';
  setAnimetitle: (title: 'romaji' | 'english' | 'native') => void;
}

export const useTitle = create<TitleStore>((set) => ({
  animetitle: 'romaji',
  setAnimetitle: (title) => set({ animetitle: title }),
}));

// Store for currently playing episode info
interface NowPlayingStore {
  nowPlaying: {
    download: string | null;
    skiptimes: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }>;
    epId: string | null;
    provider: string | null;
    epNum: string | number | null;
    subtype: string | null;
  } | null;
}

export const useNowPlaying = create<NowPlayingStore>((set) => ({
  nowPlaying: null,
}));

// Store for anime data info
interface DataInfoStore {
  dataInfo: any | null;
}

export const useDataInfo = create<DataInfoStore>((set) => ({
  dataInfo: null,
}));

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
