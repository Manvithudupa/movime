import { blockedMovieIds, filterAdultContent } from './utils'

// Shared relevance scoring + catalogue filtering for search results.
//
// The search page's full results and the autocomplete dropdown both run through
// this pipeline, so a title offered by the autocomplete is never missing from
// the full search (and vice versa). Keep all synchronous search filtering here
// rather than duplicating it in either consumer.

// A title scoring at or above this is a direct answer to the query ("title
// contains the query"), so the quality filters below must not hide it.
export const DIRECT_MATCH_SCORE = 0.72

// Catalogue entries older than this are hidden unless the user named the title
// directly or asked for an older year explicitly.
const MIN_YEAR = 2004

export type ScoredSearchResult<T> = T & { __rel: number }

export const normalizeSearchText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

// Relevance of a title against the raw query. Returns 0 for no match and 1.0 for
// an exact match; the tiers in between separate prefix/word/contains matches
// (>= DIRECT_MATCH_SCORE) from loose subsequence matches.
export const searchRelevanceScore = (query: string, title: string): number => {
  const q = normalizeSearchText(query)
  const t = normalizeSearchText(title)
  if (!t || !q) return 0
  if (t === q) return 1.0
  if (t.startsWith(q)) return 0.92
  if (t.split(' ').some((word) => word.startsWith(q))) return 0.86
  if (t.includes(q)) return 0.72
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  const seqRatio = qi / q.length
  if (seqRatio >= 0.8) return 0.6 + (seqRatio - 0.8) * 0.2
  return seqRatio >= 0.5 ? 0.4 + (seqRatio - 0.5) * 0.2 : 0
}

// Short queries need a tight match; longer ones tolerate looser ones.
export const minimumRelevanceScore = (query: string): number => {
  const length = normalizeSearchText(query).length
  return length <= 4 ? 0.86 : length <= 6 ? 0.6 : 0.5
}

// Filter + rank raw TMDB multi-search results. Pure and synchronous, so every
// caller sees the same candidate set for a given query.
export function filterRankSearchResults<T extends Record<string, any>>(
  results: T[] | undefined,
  query: string
): ScoredSearchResult<T>[] {
  const qLower = query.toLowerCase()
  // Only an explicit whole-word adult term lifts the metadata filter. A
  // substring check also matched innocent queries ("adulting", "unisex",
  // "adult swim") and silently switched filtering off for them.
  const allowAdult = /\b(adult|sex|erotic|xxx|porn|explicit|nude)\b/i.test(qLower)

  // Multi-search can return people/companies — only keep watchable titles so
  // links point at valid /details and /watch pages.
  const watchable = (results || []).filter(
    (item: any) =>
      !blockedMovieIds.includes(String(item.id)) &&
      (item.media_type === 'movie' || item.media_type === 'tv')
  )

  let items = (filterAdultContent(watchable, allowAdult) as T[]).map(
    (item): ScoredSearchResult<T> => ({
      ...item,
      __rel: searchRelevanceScore(qLower, item.title || item.name || ''),
    })
  )

  const isDirectMatch = (item: ScoredSearchResult<T>) => item.__rel >= DIRECT_MATCH_SCORE

  const explicitOlderYearMatch = query.match(/\b(19\d{2}|200[0-3])\b/)
  if (!explicitOlderYearMatch) {
    items = items.filter((item: any) => {
      // Keep direct title matches regardless of age — the user typed this name.
      if (isDirectMatch(item)) return true
      const date = item.release_date || item.first_air_date
      if (!date) return true
      const year = parseInt(date.slice(0, 4))
      if (!year) return true
      return year >= MIN_YEAR
    })
  }

  const wantsReality = /\breality\b/i.test(qLower)
  if (!wantsReality) {
    items = items.filter((item: any) => {
      if (item.genre_ids?.includes(10764)) return false
      const title = (item.title || item.name || '').toLowerCase()
      if (title.includes('reality')) return false
      return true
    })
  }

  const minScore = minimumRelevanceScore(query)
  items = items.filter((item) => item.__rel >= minScore)
  items.sort(
    (a, b) => b.__rel - a.__rel || ((b.popularity || 0) - (a.popularity || 0))
  )
  return items
}

// Runtimes are fetched asynchronously, so the full search applies one extra
// ordering pass that the autocomplete cannot afford. It must not *remove*
// entries: doing so is exactly what made a suggestion disappear from the full
// results. Instead short clips/trailers are demoted to the end, keeping the
// candidate set identical in both places (TMDB returns a single page, so the
// move never pushes a title past the display limit).
export const MIN_DURATION_MIN = 40

export const allowsShortContent = (query: string): boolean =>
  /\b(short|clip|mini|reel)\b/i.test(query)

// Short items sink below everything else, but nothing the user asked for by
// name is demoted. Array.prototype.sort is stable, so relevance order is kept
// within each group.
export function rankByRuntime(
  items: ScoredSearchResult<any>[],
  runtimeOf: (id: number) => number | undefined
): ScoredSearchResult<any>[] {
  const isShort = (item: ScoredSearchResult<any>): boolean => {
    if (item.__rel >= DIRECT_MATCH_SCORE) return false
    const duration = runtimeOf(item.id)
    return !!duration && duration < MIN_DURATION_MIN
  }
  return [...items].sort((a, b) => Number(isShort(a)) - Number(isShort(b)))
}

// Strips the internal relevance score before handing items to the UI.
export const stripInternalScores = <T extends Record<string, any>>(
  items: (T & { __rel?: number })[]
): T[] => items.map(({ __rel, ...rest }) => rest as T)
