import { describe, it, expect } from 'vitest'
import {
  filterRankSearchResults,
  searchRelevanceScore,
  normalizeSearchText,
  minimumRelevanceScore,
  rankByRuntime,
  stripInternalScores,
  DIRECT_MATCH_SCORE,
} from '../searchFilter'

// Minimal TMDB multi-search result shape.
const item = (over: Record<string, any>) => ({
  id: 1,
  media_type: 'movie',
  title: '',
  overview: 'a harmless description',
  popularity: 10,
  ...over,
})

const ids = (rows: { id: number }[]) => rows.map((r) => r.id).sort((a, b) => a - b)

describe('searchRelevanceScore', () => {
  it('ranks exact, prefix, word-prefix and contains matches in order', () => {
    const query = 'dune'
    expect(searchRelevanceScore(query, 'Dune')).toBe(1.0)
    expect(searchRelevanceScore(query, 'Dune: Part Two')).toBe(0.92)
    expect(searchRelevanceScore(query, 'The Dune Story')).toBe(0.86)
    expect(searchRelevanceScore(query, 'A Dune Abridged Cut')).toBe(0.86)
    expect(searchRelevanceScore(query, '')).toBe(0)
  })

  it('ignores punctuation and casing when comparing', () => {
    expect(normalizeSearchText('  Spider-Man:  No Way Home ')).toBe('spider man no way home')
    expect(searchRelevanceScore('spider man', 'Spider-Man')).toBe(1.0)
  })

  it('demands a tighter match for short queries', () => {
    expect(minimumRelevanceScore('dune')).toBe(0.86)
    expect(minimumRelevanceScore('dune 2')).toBe(0.6)
    expect(minimumRelevanceScore('dune part two')).toBe(0.5)
  })
})

describe('filterRankSearchResults', () => {
  it('keeps a directly named older title (Hilda Hurricane regression)', () => {
    const results = [
      item({
        id: 72351,
        media_type: 'tv',
        title: undefined,
        name: 'Hilda Hurricane',
        first_air_date: '1998-05-27',
        overview: 'a young model becomes the city celebrity',
        popularity: 0.6,
      }),
    ]

    const ranked = filterRankSearchResults(results, 'hilda hurricane')

    expect(ids(ranked)).toEqual([72351])
    expect(ranked[0].__rel).toBe(1.0)
  })

  it('still hides loose matches to an old title the user did not name', () => {
    const old = item({ id: 1, title: 'Internal Stellar', release_date: '1998-01-01' })
    const modern = item({ id: 2, title: 'Internal Stellar', release_date: '2014-01-01' })

    // The title only matches the query as a loose subsequence, so the year
    // filter still applies and the 1998 entry is dropped.
    expect(filterRankSearchResults([old], 'interstellar')).toHaveLength(0)
    expect(ids(filterRankSearchResults([modern], 'interstellar'))).toEqual([2])
  })

  it('keeps a directly named title even when a year filter would drop it', () => {
    const results = [
      item({ id: 1, title: 'Old Classic', release_date: '1994-01-01' }),
    ]
    expect(ids(filterRankSearchResults(results, 'old classic'))).toEqual([1])
  })

  it('only keeps watchable, non-blocked titles', () => {
    const results = [
      item({ id: 1, title: 'Dune' }),
      item({ id: 106862, title: 'Blocked Movie' }),
      item({ id: 3, media_type: 'person', name: 'Dune' }),
      item({ id: 4, title: 'Dune XXX' }),
    ]

    const ranked = filterRankSearchResults(results, 'dune')

    expect(ids(ranked)).toEqual([1])
  })

  it('keeps adult content when the query explicitly asks for it', () => {
    const results = [
      item({ id: 1, title: 'Sex Tape' }),
      item({ id: 2, title: 'Dune' }),
    ]

    const ranked = filterRankSearchResults(results, 'sex tape')

    expect(ids(ranked)).toEqual([1])
  })

  it('hides reality shows the query only loosely matches', () => {
    const results = [
      item({ id: 1, title: 'Inter stellar reality', genre_ids: [10764] }),
      item({ id: 2, title: 'Interstellar' }),
    ]

    // id 1 clears the relevance threshold but is not a direct match, so the
    // reality filter still applies.
    expect(ids(filterRankSearchResults(results, 'interstellar'))).toEqual([2])
  })

  it('keeps reality shows when the query explicitly asks for reality', () => {
    const results = [item({ id: 1, title: 'Reality Interstellar', genre_ids: [10764] })]

    expect(ids(filterRankSearchResults(results, 'reality interstellar'))).toEqual([1])
  })

  it('keeps a reality show the user named directly', () => {
    const results = [
      item({ id: 1, title: 'Reality Show Dune', genre_ids: [10764] }),
      item({ id: 2, title: 'Dune' }),
    ]

    // "Dune" is a whole word in the reality title, so it is a direct match and
    // the catalogue-quality filter must not hide it.
    expect(ids(filterRankSearchResults(results, 'dune'))).toEqual([1, 2])
  })

  it('keeps a direct match even when a short query threshold would drop it', () => {
    // A 3-letter query demands 0.86, but "Mahim" matching as a "contains" tier
    // is only 0.72 — still a direct answer to what the user typed.
    const results = [item({ id: 1, title: 'Mahim', release_date: '2024-05-10' })]
    expect(ids(filterRankSearchResults(results, 'him'))).toEqual([1])
  })

  it('sorts by relevance, then popularity', () => {
    const results = [
      item({ id: 1, title: 'Dune: Part Two', popularity: 999 }),
      item({ id: 2, title: 'Dune', popularity: 5 }),
    ]

    // The exact title beats the prefix tier despite far lower popularity.
    expect(filterRankSearchResults(results, 'dune').map((r) => r.id)).toEqual([2, 1])

    // Same tier — popularity breaks the tie.
    const tied = [
      item({ id: 3, title: 'Dune Abridged', popularity: 1, release_date: '2020-01-01' }),
      item({ id: 4, title: 'Dune Extended', popularity: 50, release_date: '2020-01-01' }),
    ]
    expect(filterRankSearchResults(tied, 'dune').map((r) => r.id)).toEqual([4, 3])
  })
})

describe('autocomplete / full-search agreement', () => {
  const results = [
    item({ id: 1, title: 'Dune', release_date: '2021-10-22', popularity: 100 }),
    item({ id: 2, title: 'Dune: Part Two', release_date: '2024-03-01', popularity: 90 }),
    item({ id: 3, title: 'Dune (1984)', release_date: '1984-12-14', popularity: 20 }),
    item({ id: 4, title: 'Dune Drifter', release_date: '2020-01-01', popularity: 5 }),
    item({ id: 5, title: 'The Dune Story', release_date: '2019-01-01', popularity: 4 }),
    item({ id: 6, media_type: 'person', name: 'Dune' }),
    item({ id: 7, title: 'Dune XXX' }),
  ]

  it('offers nothing in the dropdown that the results page hides', () => {
    const ranked = filterRankSearchResults(results, 'dune')
    // What each surface shows: dropdown = top 6, page = top 40.
    const autocompleteSet = ids(ranked.slice(0, 6))
    const pageSet = ids(ranked.slice(0, 60).slice(0, 40))

    for (const id of autocompleteSet) {
      expect(pageSet).toContain(id)
    }
    expect(pageSet).toEqual(ids(ranked))
  })

  it('demotes short clips for the page but still lists them (no drops)', () => {
    // Both survive only as loose subsequence matches (__rel 0.64 / 0.61), so
    // neither is a direct match and both are demotable.
    const ranked = filterRankSearchResults(
      [
        item({ id: 1, title: 'Inter stellar', release_date: '2014-01-01', popularity: 50 }),
        item({ id: 2, title: 'Intersteller', release_date: '2014-01-01', popularity: 10 }),
      ],
      'interstellar'
    )
    expect(ranked.map((r) => r.id)).toEqual([1, 2])
    expect(ranked[0].__rel).toBeGreaterThan(ranked[1].__rel)

    const pageRows = rankByRuntime(ranked, (id) => (id === 1 ? 3 : 120)) // id 1 is a 3-minute clip

    // Same candidate set — the runtime pass only reorders.
    expect(ids(pageRows)).toEqual(ids(ranked))
    // ...and the clip sinks below the full-length entry.
    expect(pageRows.map((r) => r.id)).toEqual([2, 1])
  })

  it('never demotes a direct match, even if it is short', () => {
    const ranked = filterRankSearchResults(results, 'dune')
    // Every fixture with an id is a direct "dune" match, so a short runtime
    // must not push any of them down.
    const pageRows = rankByRuntime(ranked, () => 5)

    expect(pageRows.map((r) => r.id)).toEqual(ranked.map((r) => r.id))
    expect(ranked.every((r) => r.__rel >= DIRECT_MATCH_SCORE)).toBe(true)
  })
})

describe('stripInternalScores', () => {
  it('removes the internal relevance field handed to the UI', () => {
    const stripped = stripInternalScores([{ id: 1, title: 'Dune', __rel: 0.92 }])
    expect(stripped).toEqual([{ id: 1, title: 'Dune' }])
    expect('__rel' in stripped[0]).toBe(false)
  })
})
