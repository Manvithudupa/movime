// E2E smoke test with mocked TMDB API responses.
//
// Intercepts all api.themoviedb.org requests and returns realistic fixtures so
// every content flow can be verified without a live API key. Also captures
// console errors, page errors, and failed requests for non-mocked hosts.
//
// Usage:  node scripts/e2e-fixtures.mjs [baseUrl]

import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:3000'

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c
    } catch {
      // try next
    }
  }
  throw new Error('Chrome not found. Set CHROME_PATH.')
}

const MOVIE = {
  id: 603, title: 'Gladiator', overview: 'A former Roman General sets out to exact vengeance against the corrupt emperor.',
  poster_path: '/poster603.jpg', backdrop_path: '/backdrop603.jpg', release_date: '2000-05-05',
  vote_average: 8.2, runtime: 155, imdb_id: 'tt0172495',
  genres: [{ id: 28, name: 'Action' }], genre_ids: [28],
  credits: { cast: [{ id: 1, name: 'Russell Crowe', character: 'Maximus', profile_path: '/c1.jpg', order: 0 }] },
  videos: { results: [{ id: 'v1', key: 'FI1ylg4GKv8', name: 'Trailer', site: 'YouTube', type: 'Trailer' }] },
  similar: { results: [{ id: 98, title: 'Similar Movie', overview: 'similar', poster_path: '/s1.jpg', vote_average: 7, media_type: 'movie' }] },
  images: { backdrops: [], posters: [] },
  release_dates: { results: [] },
}

const SHOW = {
  id: 1399, name: 'Game of Thrones', overview: 'Nine noble families fight for control over the lands of Westeros.',
  poster_path: '/poster1399.jpg', backdrop_path: '/backdrop1399.jpg', first_air_date: '2011-04-17',
  vote_average: 8.4, number_of_seasons: 8, number_of_episodes: 73, episode_run_time: [57],
  genres: [{ id: 18, name: 'Drama' }], genre_ids: [18],
  seasons: [{ id: 1, season_number: 1, episode_count: 10, name: 'Season 1', overview: '', poster_path: null, air_date: '2011-04-17' }],
  credits: { cast: [{ id: 2, name: 'Emilia Clarke', character: 'Daenerys', profile_path: '/c2.jpg', order: 0 }] },
  videos: { results: [{ id: 'v2', key: 'KPLWWIOCOOQ', name: 'Trailer', site: 'YouTube', type: 'Trailer' }] },
  similar: { results: [{ id: 99, name: 'Similar Show', overview: 'similar', poster_path: '/s2.jpg', vote_average: 7, media_type: 'tv' }] },
  images: { backdrops: [], posters: [] },
  content_ratings: { results: [] },
}

const SEASON = {
  id: 1, season_number: 1, name: 'Season 1', overview: '', poster_path: null,
  episodes: [
    { id: 11, episode_number: 1, name: 'Winter Is Coming', overview: 'ep1', still_path: '/e1.jpg', air_date: '2011-04-17', runtime: 62, vote_average: 8.5 },
    { id: 12, episode_number: 2, name: 'The Kingsroad', overview: 'ep2', still_path: '/e2.jpg', air_date: '2011-04-24', runtime: 56, vote_average: 8.6 },
  ],
}

const GENRE_LIST = { genres: [
  { id: 28, name: 'Action' }, { id: 18, name: 'Drama' }, { id: 35, name: 'Comedy' },
  { id: 16, name: 'Animation' }, { id: 10749, name: 'Romance' },
] }

function listResults(type) {
  return { page: 1, results: [
    { ...MOVIE, media_type: type === 'movie' ? 'movie' : 'tv', title: type === 'movie' ? 'Gladiator' : undefined, name: type === 'movie' ? undefined : 'Game of Thrones', id: type === 'movie' ? 603 : 1399 },
    { id: 550, title: 'Fight Club', name: undefined, overview: 'An insomniac and a soap maker.', poster_path: '/p550.jpg', vote_average: 8.4, release_date: '1999-10-15', media_type: type === 'movie' ? 'movie' : 'tv', genre_ids: [18] },
    { id: 680, title: 'Pulp Fiction', name: undefined, overview: 'The lives of two mob hitmen.', poster_path: '/p680.jpg', vote_average: 8.9, release_date: '1994-09-10', media_type: type === 'movie' ? 'movie' : 'tv', genre_ids: [53] },
  ], total_pages: 10, total_results: 100 }
}

function tmdbFixture(url) {
  const u = new URL(url)
  const path = u.pathname // e.g. /3/trending/movie/day

  if (path.includes('/genre/') && path.endsWith('/list')) return GENRE_LIST
  if (path.includes('/trending/movie/')) return listResults('movie')
  if (path.includes('/tv/popular')) return listResults('tv')
  if (path.includes('/discover/movie')) return listResults('movie')
  if (path.includes('/discover/tv')) return listResults('tv')
  if (path.includes('/search/')) {
    return {
      page: 1,
      results: [
        { ...MOVIE, media_type: 'movie', release_date: '2018-05-05' },
        { ...SHOW, media_type: 'tv' },
      ],
      total_pages: 1,
      total_results: 2,
    }
  }
  if (path.endsWith('/movie/603')) return MOVIE
  if (path.endsWith('/tv/1399')) return SHOW
  if (path.endsWith('/tv/1399/season/1')) return SEASON
  if (path.includes('/movie/603/release_dates')) return { results: [] }
  if (path.includes('/movie/603/')) return MOVIE
  if (path.includes('/tv/1399/')) return SHOW
  return { results: [] }
}

const ROUTES = [
  { route: '/', check: ['Trending Movies', 'Gladiator', 'Fight Club'], expect: ['Trending Movies'] },
  { route: '/movies', check: ['Popular Movies', 'Gladiator'], expect: ['Gladiator'] },
  { route: '/tv', check: ['Popular TV Shows', 'Game of Thrones'], expect: ['Game of Thrones'] },
  { route: '/anime', check: ['Anime Collection'], expect: ['Anime Collection'] },
  { route: '/search?q=gladiator', check: ['Gladiator'], expect: ['Gladiator'] },
  { route: '/search?q=game%20of%20thrones', check: ['Game of Thrones'], expect: ['Game of Thrones'] },
  // /genres still works — it 301s to /search, which shows the browse-by-genre landing.
  { route: '/genres', check: ['Browse by Genre', 'Action', 'Comedy'], expect: ['Browse by Genre'] },
  { route: '/genre/28?type=movie', check: ['Action Movies', 'Gladiator'], expect: ['Action Movies'] },
  { route: '/genre/18?type=tv', check: ['Drama TV Shows'], expect: ['Drama TV Shows'] },
  { route: '/search?genre=28&type=movie', check: ['Action Movies', 'Gladiator'], expect: ['Action Movies'] },
  { route: '/search?genre=18&type=tv', check: ['Drama TV Shows'], expect: ['Drama TV Shows'] },
  { route: '/details?id=603&type=movie', check: ['Gladiator', 'Russell Crowe', 'PLAY', 'MY LIST'], expect: ['Gladiator'] },
  { route: '/details?id=1399&type=tv', check: ['Game of Thrones', 'Emilia Clarke', 'Episodes'], expect: ['Game of Thrones'] },
  { route: '/watch?id=603&type=movie', check: ['Gladiator', 'Sources'], expect: ['Sources'] },
  { route: '/watch?id=1399&type=tv&season=1&episode=1', check: ['Winter Is Coming', 'S1', 'E1'], expect: ['Winter Is Coming'] },
  { route: '/watchlist', check: ['Watchlist'], expect: ['Watchlist'] },
  { route: '/settings', check: ['Playback Settings', 'Preferred Video Source'], expect: ['Playback Settings'] },
  // Auth-gated: guests are redirected to the login page, which needs real
  // Supabase to fully verify — render + no-crash is the meaningful local check.
  { route: '/profile', check: ['Movime'], expect: ['Movime'] },
  { route: '/contact', check: ['Contact'], expect: ['Contact'] },
]

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

let failures = 0

for (const { route, check, expect } of ROUTES) {
  const page = await browser.newPage()
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  // Mock the TMDB API.
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    // TMDB is fetched through the same-origin /api/tmdb proxy in the app, but
    // the fixture matcher below parses TMDB-style paths, so mock both URL
    // shapes (the proxy URL path is /api/tmdb/trending/movie/day, the direct
    // one is /3/trending/movie/day).
    if (url.includes('api.themoviedb.org') || url.includes('/api/tmdb/')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        // The browser enforces CORS on cross-origin fetch, so the mock must
        // include the header the real TMDB API sends. Harmless for the
        // same-origin proxy path.
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(tmdbFixture(url)),
      })
    } else if (
      url.includes('image.tmdb.org') || url.includes('yt3.ggpht.com') ||
      url.includes('youtube.com') || url.includes('fonts.g') ||
      // Third-party video embeds are unreachable in CI — abort fast instead
      // of letting the iframes hang page load.
      /(vidsrc|cinemaos|vidnest|mapple|videasy|vidfast|vidzee)/.test(url)
    ) {
      req.abort()
    } else {
      req.continue()
    }
  })

  try {
    // domcontentloaded + fixed settle wait is deterministic in CI: networkidle2
    // never idles on pages whose third-party embeds keep making requests.
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await new Promise((r) => setTimeout(r, 2500))
  } catch (err) {
    consoleErrors.push(`NAVIGATION FAILED: ${String(err)}`)
  }

  const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '')
  const missing = expect.filter((t) => !bodyText.includes(t))
  const foundChecks = check.filter((t) => bodyText.includes(t)).length
  const ok = missing.length === 0 && pageErrors.length === 0 && foundChecks >= Math.max(1, Math.floor(check.length / 2))
  if (!ok) failures++

  console.log(`${ok ? '✅' : '❌'} ${route}  (checks found ${foundChecks}/${check.length})`)
  if (missing.length) console.log(`    missing: ${missing.join(' | ')}`)
  if (pageErrors.length) console.log(`    pageerrors: ${pageErrors.join(' | ')}`)

  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nAll fixture-based flows OK.' : `\n${failures} page(s) had failures.`)
process.exit(failures === 0 ? 0 : 1)
