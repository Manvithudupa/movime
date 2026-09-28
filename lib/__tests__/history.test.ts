import { describe, it, expect } from 'vitest'
import { formatRelativeTime, groupHistoryByDay } from '../history'
import type { ContinueWatchingItem } from '../store'

function historyItem(updatedAt: Date, overrides: Partial<ContinueWatchingItem> = {}): ContinueWatchingItem {
  return {
    id: `${overrides.content_id ?? 1}`,
    content_id: 1,
    content_type: 'movie',
    title: 'Some Movie',
    poster_path: null,
    backdrop_path: null,
    season_number: null,
    episode_number: null,
    episode_title: null,
    progress_seconds: 60,
    duration_seconds: 600,
    progress_percentage: 10,
    is_completed: false,
    updated_at: updatedAt.toISOString(),
    ...overrides,
  }
}

// Local-time dates, because the bucketing works on calendar days.
const now = new Date(2026, 8, 28, 12, 0) // 28 Sep 2026, noon

describe('groupHistoryByDay', () => {
  it('splits entries into Today, Yesterday, and Earlier', () => {
    const groups = groupHistoryByDay([
      historyItem(new Date(2026, 8, 25, 20, 0), { content_id: 3, title: 'Older' }),
      historyItem(new Date(2026, 8, 28, 9, 0), { content_id: 1, title: 'Today' }),
      historyItem(new Date(2026, 8, 27, 21, 0), { content_id: 2, title: 'Yesterday' }),
    ], now)

    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Earlier'])
    expect(groups.map((g) => g.items.map((i) => i.title))).toEqual([
      ['Today'],
      ['Yesterday'],
      ['Older'],
    ])
  })

  it('omits empty groups and orders each group newest first', () => {
    const groups = groupHistoryByDay([
      historyItem(new Date(2026, 8, 28, 8, 0), { content_id: 1, title: 'Morning' }),
      historyItem(new Date(2026, 8, 28, 11, 0), { content_id: 2, title: 'Lunchtime' }),
    ], now)

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Today')
    expect(groups[0].items.map((i) => i.title)).toEqual(['Lunchtime', 'Morning'])
  })

  it('treats an 11pm entry as yesterday, not as 24 hours ago', () => {
    const groups = groupHistoryByDay([
      historyItem(new Date(2026, 8, 27, 23, 55), { title: 'Late last night' }),
    ], now)

    expect(groups[0].label).toBe('Yesterday')
  })

  it('files an entry from just after midnight under Today', () => {
    const groups = groupHistoryByDay([
      historyItem(new Date(2026, 8, 28, 0, 5), { title: 'After midnight' }),
    ], now)

    expect(groups[0].label).toBe('Today')
  })

  it('falls back to Earlier for an unusable timestamp instead of throwing', () => {
    const groups = groupHistoryByDay([
      historyItem(new Date(), { title: 'Broken', updated_at: 'not-a-date' }),
    ], now)

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Earlier')
  })
})

describe('formatRelativeTime', () => {
  const at = (iso: string) => formatRelativeTime(iso, now.getTime())

  it('describes recent activity in minutes and hours', () => {
    expect(at(new Date(2026, 8, 28, 11, 59, 30).toISOString())).toBe('Just now')
    expect(at(new Date(2026, 8, 28, 11, 55).toISOString())).toBe('5 minutes ago')
    expect(at(new Date(2026, 8, 28, 9, 0).toISOString())).toBe('3 hours ago')
  })

  it('describes older activity in days and weeks', () => {
    expect(at(new Date(2026, 8, 26, 12, 0).toISOString())).toBe('2 days ago')
    expect(at(new Date(2026, 8, 14, 12, 0).toISOString())).toBe('2 weeks ago')
  })

  it('returns an empty string for an unusable timestamp', () => {
    expect(at('not-a-date')).toBe('')
  })
})
