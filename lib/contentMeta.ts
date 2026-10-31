import type { Metadata } from 'next'

const SITE_URL = 'https://movime.vercel.app'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

/**
 * Builds page metadata for the /details and /watch routes by fetching the
 * content's basics from TMDB. Fully self-contained so it can never crash a
 * request: any failure (missing API key, network error, bad id) falls back to
 * a generic title.
 */
export async function getContentMetadata(
  id: string | undefined,
  typeParam: string | null,
  page: 'details' | 'watch'
): Promise<Metadata> {
  const fallbackTitle = page === 'watch' ? 'Watch - Movime' : 'Details - Movime'
  if (!id) return { title: fallbackTitle }

  // Server-side only. The key must never be exposed through a NEXT_PUBLIC_
  // variable, which would inline it into the client bundle.
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return { title: fallbackTitle }

  const type = typeParam === 'tv' ? 'tv' : 'movie'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${apiKey}&language=en-US`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timeout)

    if (!res.ok) return { title: fallbackTitle }

    const data = await res.json()
    const title = (type === 'tv' ? data.name : data.title) || ''
    const year = (data.release_date || data.first_air_date || '').slice(0, 4)
    const description =
      (data.overview || '').slice(0, 160) || `Watch ${title || 'this title'} on Movime.`
    const poster = data.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}`
      : `${SITE_URL}/logo.png`

    const pageTitle =
      page === 'watch'
        ? `Watch ${title} Online Free - Movime`
        : `${title}${year ? ` (${year})` : ''} - Movime`

    return {
      title: pageTitle,
      description,
      openGraph: {
        type: type === 'tv' ? 'video.tv_show' : 'video.movie',
        title: pageTitle,
        description,
        url: `${SITE_URL}/${page}?id=${id}&type=${type}`,
        images: [{ url: poster, width: 500, height: 750, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: pageTitle,
        description,
        images: [poster],
      },
    }
  } catch {
    return { title: fallbackTitle }
  }
}
