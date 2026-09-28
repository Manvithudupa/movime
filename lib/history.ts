import type { ContinueWatchingItem } from './store'

// Watch-history presentation helpers. Kept out of the page component so the
// date bucketing (which has real day-boundary edge cases) can be unit tested.

export const HISTORY_GROUPS = ['Today', 'Yesterday', 'Earlier'] as const
export type HistoryGroupLabel = typeof HISTORY_GROUPS[number]

/** Milliseconds since epoch for when an entry was last watched (0 if unusable). */
const watchedAt = (item: ContinueWatchingItem): number => {
  const time = new Date(item.updated_at).getTime()
  return Number.isFinite(time) ? time : 0
}

export const byNewestFirst = (a: ContinueWatchingItem, b: ContinueWatchingItem): number =>
  watchedAt(b) - watchedAt(a)

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/**
 * Buckets history entries into Today / Yesterday / Earlier, newest first.
 *
 * Entries are sorted here rather than trusting the source order, so the
 * sections stay correct for guests (whose localStorage list may be stale) as
 * well as for server responses. "Yesterday" is the previous calendar day, not
 * `now - 24h`, which would misfile an 11pm entry the next morning.
 */
export function groupHistoryByDay(
  items: ContinueWatchingItem[],
  now: Date = new Date()
): { label: HistoryGroupLabel; items: ContinueWatchingItem[] }[] {
  const todayStart = startOfDay(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStart = startOfDay(yesterday)

  const buckets: Record<HistoryGroupLabel, ContinueWatchingItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  }

  for (const item of [...items].sort(byNewestFirst)) {
    const time = watchedAt(item)
    if (time >= todayStart) buckets.Today.push(item)
    else if (time >= yesterdayStart) buckets.Yesterday.push(item)
    else buckets.Earlier.push(item)
  }

  return HISTORY_GROUPS
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, items: buckets[label] }))
}

/** History is about *when* something was watched, so relative beats raw dates. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''

  const minutes = Math.floor((now - then) / (60 * 1000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`

  return new Date(iso).toLocaleDateString()
}
