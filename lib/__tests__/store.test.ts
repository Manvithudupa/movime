// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useWatchlistStore, useContinueWatchingStore, type ContinueWatchingItem } from '../store'

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
})
