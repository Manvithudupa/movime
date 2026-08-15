import type { MetadataRoute } from 'next'

const SITE_URL = 'https://movime.vercel.app'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: 'hourly', priority: 1 },
  { url: `${SITE_URL}/movies`, changeFrequency: 'hourly', priority: 0.9 },
  { url: `${SITE_URL}/tv`, changeFrequency: 'hourly', priority: 0.9 },
  { url: `${SITE_URL}/anime`, changeFrequency: 'hourly', priority: 0.9 },
  { url: `${SITE_URL}/search`, changeFrequency: 'weekly', priority: 0.5 },
  { url: `${SITE_URL}/watchlist`, changeFrequency: 'weekly', priority: 0.4 },
  { url: `${SITE_URL}/genres`, changeFrequency: 'weekly', priority: 0.6 },
  { url: `${SITE_URL}/settings`, changeFrequency: 'monthly', priority: 0.3 },
  { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
]

async function fetchGenreRoutes(type: 'movie' | 'tv'): Promise<MetadataRoute.Sitemap> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
  if (!apiKey) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `${TMDB_BASE_URL}/genre/${type}/list?api_key=${apiKey}&language=en-US`,
      { signal: controller.signal, next: { revalidate: 86400 } }
    )
    clearTimeout(timeout)

    if (!res.ok) return []

    const data = await res.json()
    const genres: any[] = data?.genres || []

    return genres.map((genre) => ({
      url: `${SITE_URL}/genre/${genre.id}?type=${type}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    return []
  }
}

async function fetchPopular(type: 'movie' | 'tv', limit: number): Promise<MetadataRoute.Sitemap> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
  if (!apiKey) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(
      `${TMDB_BASE_URL}/${type}/popular?api_key=${apiKey}&language=en-US&page=1`,
      { signal: controller.signal, next: { revalidate: 86400 } }
    )
    clearTimeout(timeout)

    if (!res.ok) return []

    const data = await res.json()
    const results: any[] = data?.results || []

    return results.slice(0, limit).map((item) => ({
      url: `${SITE_URL}/details?id=${item.id}&type=${type}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      lastModified: item.first_air_date || item.release_date || undefined,
    }))
  } catch {
    // No API key or network failure at build time — fall back to static routes only.
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Each popular title also has a /watch URL, but submitting only the details
  // pages keeps the sitemap lean while still pointing crawlers at the content.
  const [movies, tvShows, movieGenres, tvGenres] = await Promise.all([
    fetchPopular('movie', 100),
    fetchPopular('tv', 100),
    fetchGenreRoutes('movie'),
    fetchGenreRoutes('tv'),
  ])

  return [...STATIC_ROUTES, ...movieGenres, ...tvGenres, ...movies, ...tvShows]
}
