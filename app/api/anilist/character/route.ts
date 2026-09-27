import { NextRequest, NextResponse } from 'next/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'

const ANILIST_API_URL = 'https://graphql.anilist.co'

const CHARACTER_SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      characters(search: $search) {
        id
        name {
          first
          last
          full
          native
        }
        image {
          large
          medium
        }
        media(page: 1, perPage: 3) {
          nodes {
            id
            title {
              romaji
              english
            }
            type
          }
        }
        description
        gender
        dateOfBirth {
          year
          month
          day
        }
        age
      }
    }
  }
`

const CHARACTER_DETAIL_QUERY = `
  query ($id: Int) {
    Character(id: $id) {
      id
      name {
        first
        last
        full
        native
      }
      image {
        large
        medium
      }
      media(page: 1, perPage: 5) {
        nodes {
          id
          title {
            romaji
            english
          }
          type
          format
        }
      }
      description
      gender
      dateOfBirth {
        year
        month
        day
      }
      age
      favourites
    }
  }
`

// AniList is queried with POST, which Next's fetch data cache does not store,
// yet character data is effectively static. Cache results per server instance
// so repeated searches/opening the picker don't hammer the upstream API.
const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 200
type CacheEntry = { expiresAt: number; value: unknown }
const anilistCache = new Map<string, CacheEntry>()

function readCache<T>(key: string): T | undefined {
  const entry = anilistCache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    anilistCache.delete(key)
    return undefined
  }
  return entry.value as T
}

function writeCache(key: string, value: unknown) {
  if (anilistCache.size >= CACHE_MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the oldest.
    const oldest = anilistCache.keys().next().value
    if (oldest !== undefined) anilistCache.delete(oldest)
  }
  anilistCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value })
}

export async function GET(request: NextRequest) {
  // This route is unauthenticated and proxies to the AniList GraphQL API, so it
  // must be rate limited like every other endpoint — otherwise it's a free
  // relay for hammering AniList.
  const limited = await rateLimitGlobal(request, { limit: 30, windowMs: 60 * 1000, keyPrefix: 'anilist-character' })
  if (!limited.success) return rateLimitResponse(limited)

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const id = searchParams.get('id')

  if (id) {
    // Fetch character by ID. Number() rejects trailing garbage that parseInt
    // would truncate ('12abc' -> 12) and turns 'abc' into NaN — forwarding
    // either to AniList returns a confusing upstream error instead of a 400.
    const numericId = Number(id)

    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid character id' }, { status: 400 })
    }

    const idCacheKey = `id:${numericId}`
    const cachedCharacter = readCache<unknown>(idCacheKey)
    if (cachedCharacter !== undefined) {
      return NextResponse.json(cachedCharacter)
    }

    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CHARACTER_DETAIL_QUERY,
          variables: { id: numericId }
        })
      })
      
      const data = await response.json()
      
      if (data.errors) {
        return NextResponse.json({ error: data.errors[0].message }, { status: 400 })
      }
      
      const character = data.data?.Character || null
      writeCache(idCacheKey, character)
      return NextResponse.json(character)
    } catch (error) {
      console.error('AniList character fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 })
    }
  }

  // Whitespace-only searches passed the old truthiness check and were sent
  // upstream; require an actual trimmed term and cap its length so one request
  // can't send an unbounded GraphQL variable.
  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Search query required' }, { status: 400 })
  }

  const searchTerm = query.trim()

  if (searchTerm.length > 100) {
    return NextResponse.json({ error: 'Search query is too long' }, { status: 400 })
  }

  const queryCacheKey = `q:${searchTerm.toLowerCase()}`
  const cachedResults = readCache<unknown>(queryCacheKey)
  if (cachedResults !== undefined) {
    return NextResponse.json(cachedResults)
  }

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CHARACTER_SEARCH_QUERY,
        variables: { search: searchTerm, page: 1, perPage: 20 }
      })
    })
    
    const data = await response.json()
    
    if (data.errors) {
      return NextResponse.json({ error: data.errors[0].message }, { status: 400 })
    }

    // Return only relevant character data (strip description for performance)
    const characters = (data.data?.Page?.characters || []).map((char: any) => ({
      id: char.id,
      name: char.name,
      image: char.image,
      media: char.media,
      gender: char.gender,
      age: char.age,
    }))

    const payload = {
      characters,
      pageInfo: data.data?.Page?.pageInfo
    }
    writeCache(queryCacheKey, payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('AniList search error:', error)
    return NextResponse.json({ error: 'Failed to search characters' }, { status: 500 })
  }
}
