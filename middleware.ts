import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Legacy ?view= params that now have their own dedicated pages
const VIEW_REDIRECTS: Record<string, string> = {
  movies: '/movies',
  tv: '/tv',
  anime: '/anime',
}

export async function middleware(request: NextRequest) {
  // Redirect legacy URLs like /?view=movies to the dedicated pages
  const view = request.nextUrl.searchParams.get('view')
  const redirectPath = view ? VIEW_REDIRECTS[view] : null
  if (redirectPath) {
    const url = request.nextUrl.clone()
    url.pathname = redirectPath
    url.searchParams.delete('view')
    return NextResponse.redirect(url)
  }

  // Genre browsing now lives on the search page — keep old /genres and
  // /genre/[id] links (bookmarks, external sites, sitemap caches) working.
  if (request.nextUrl.pathname === '/genres') {
    return NextResponse.redirect(new URL('/search', request.url), 301)
  }
  if (request.nextUrl.pathname.startsWith('/genre/')) {
    const genreId = request.nextUrl.pathname.split('/')[2]
    if (genreId) {
      // Cloning keeps the ?type= query param from the old URL.
      const url = request.nextUrl.clone()
      url.pathname = '/search'
      url.searchParams.set('genre', genreId)
      return NextResponse.redirect(url, 301)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - workbox-*.js (PWA workbox files)
     * - public folder assets
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|icons/|logo.png|.*\\.svg).*)',
  ],
}
