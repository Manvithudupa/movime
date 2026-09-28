// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useWatchlistStore,
  useContinueWatchingStore,
  CONTINUE_WATCHING_DEFAULT_LIMIT,
  CONTINUE_WATCHING_HISTORY_LIMIT,
  type ContinueWatchingItem,
} from '../store'

function watchlistItem(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    content_id: 1,
    content_type: 'movie' as const,
    title: 'Inception',
    poster_path: null,
    status: 'plan_to_watch',
    added_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('watchlist store', () => {
  beforeEach(() => {
    useWatchlistStore.getState().clear()
    localStorage.clear()
  })

  it('adds and removes items', () => {
    const { add } = useWatchlistStore.getState()
    add(watchlistItem())
    expect(useWatchlistStore.getState().count).toBe(1)
    useWatchlistStore.getState().remove(1)
    expect(useWatchlistStore.getState().count).toBe(0)
  })

  it('add on an existing item replaces it (upsert)', () => {
    const { add } = useWatchlistStore.getState()
    add(watchlistItem())
    add(watchlistItem({ status: 'watching' }))
    expect(useWatchlistStore.getState().count).toBe(1)
    expect(useWatchlistStore.getState().items[0].status).toBe('watching')
  })

  it('toggle removes an existing item and adds if absent', () => {
    const { toggle } = useWatchlistStore.getState()
    toggle(watchlistItem())
    expect(useWatchlistStore.getState().count).toBe(1)
    toggle(watchlistItem())
    expect(useWatchlistStore.getState().count).toBe(0)
    toggle(watchlistItem())
    expect(useWatchlistStore.getState().count).toBe(1)
  })

  it('updates status', () => {
    const { add, updateStatus } = useWatchlistStore.getState()
    add(watchlistItem())
    updateStatus(1, 'watching')
    expect(useWatchlistStore.getState().items[0].status).toBe('watching')
  })

  it('treats a movie and a TV show sharing the same TMDB id as distinct entries', () => {
    const { add } = useWatchlistStore.getState()
    // TMDB reuses its numeric id space across media types, so this pair must
    // not collide the way the old content_id-only matcher made them.
    add(watchlistItem({ id: 7, content_id: 7, content_type: 'movie', title: 'Same Id Movie' }))
    add(watchlistItem({ id: 8, content_id: 7, content_type: 'tv', title: 'Same Id Show' }))

    expect(useWatchlistStore.getState().count).toBe(2)
    expect(useWatchlistStore.getState().isInWatchlist(7, 'movie')).toBe(true)
    expect(useWatchlistStore.getState().isInWatchlist(7, 'tv')).toBe(true)

    // Status updates and removals stay scoped to one type.
    useWatchlistStore.getState().updateStatus(7, 'watching', 'tv')
    const movie = useWatchlistStore.getState().items.find((i) => i.content_type === 'movie')
    const show = useWatchlistStore.getState().items.find((i) => i.content_type === 'tv')
    expect(movie?.status).toBe('plan_to_watch')
    expect(show?.status).toBe('watching')

    useWatchlistStore.getState().remove(7, 'movie')
    const remaining = useWatchlistStore.getState().items
    expect(remaining).toHaveLength(1)
    expect(remaining[0].content_type).toBe('tv')
  })

  it('recovers when the cached list is not an array', async () => {
    // A non-array value used to throw inside .map(), and the catch block threw
    // again with the same value — leaving isLoading stuck true, which made
    // every later fetch() a silent no-op for the rest of the session.
    localStorage.setItem('watchLater', JSON.stringify({ not: 'an array' }))

    await useWatchlistStore.getState().fetch(false)
    await useWatchlistStore.getState().fetch(false)

    expect(useWatchlistStore.getState().isLoading).toBe(false)
    expect(useWatchlistStore.getState().items).toEqual([])
    expect(useWatchlistStore.getState().count).toBe(0)
  })
})

describe('continue watching store', () => {
  beforeEach(() => {
    useContinueWatchingStore.getState().clear()
    localStorage.clear()
  })

  it('keeps a single entry per show and merges episode progress', async () => {
    const { upsert } = useContinueWatchingStore.getState()
    const base: Partial<ContinueWatchingItem> = {
      content_id: 1,
      content_type: 'tv',
      title: 'Some Show',
      poster_path: null,
      backdrop_path: null,
      season_number: 1,
      episode_number: 1,
      episode_title: 'Pilot',
      progress_seconds: 0,
      duration_seconds: 2700,
      progress_percentage: 0,
      is_completed: false,
    }

    await upsert(base, false)
    expect(useContinueWatchingStore.getState().items).toHaveLength(1)

    // Switching episodes updates the same row instead of creating a duplicate.
    await upsert(
      { ...base, episode_number: 2, episode_title: 'Second', progress_seconds: 300, progress_percentage: 11 },
      false
    )
    const items = useContinueWatchingStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].episode_number).toBe(2)
    expect(items[0].episode_title).toBe('Second')
    expect(items[0].progress_percentage).toBe(11)

    // Persisted to localStorage for guests.
    expect(localStorage.getItem('continueWatching')).not.toBeNull()
  })

  it('refetches when a caller asks for more rows than the cache holds', async () => {
    const rows = [
      { id: 1, content_id: 1, content_type: 'movie', title: 'A' },
      { id: 2, content_id: 2, content_type: 'movie', title: 'B' },
    ]
    // Return only as many rows as the caller asked for, like the API does.
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => rows.slice(0, url.includes(`limit=${CONTINUE_WATCHING_HISTORY_LIMIT}`) ? 2 : 1),
    }))
    vi.stubGlobal('fetch', fetchMock)

    // The home row asks for the small window.
    await useContinueWatchingStore.getState().fetch(true)
    expect(fetchMock.mock.calls[0][0]).toContain(`limit=${CONTINUE_WATCHING_DEFAULT_LIMIT}`)
    expect(useContinueWatchingStore.getState().items).toHaveLength(1)

    // A fresh cache for the same window is reused.
    await useContinueWatchingStore.getState().fetch(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // The history page asks for everything — a bigger limit must refetch
    // instead of being served the truncated cache.
    await useContinueWatchingStore.getState().fetch(true, CONTINUE_WATCHING_HISTORY_LIMIT)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain(`limit=${CONTINUE_WATCHING_HISTORY_LIMIT}`)
    expect(useContinueWatchingStore.getState().items).toHaveLength(2)

    // ...and the smaller caller is satisfied by the fuller cache.
    await useContinueWatchingStore.getState().fetch(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
  })
})
