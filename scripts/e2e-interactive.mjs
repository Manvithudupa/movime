// Interactive E2E verification — exercises flows the static smoke test can't:
//   1. /profile render (why does the smoke test find no 'Movime' text?)
//   2. Watchlist add/remove with a same-id movie + TV pair (content_type fix)
//   3. Search autocomplete -> details deep-link
//   4. Details MY LIST add/remove toggle (guest, localStorage)
//   5. Continue-watching save + dismiss (guest, localStorage)
//   6. Settings preferred-source round-trip (guest, localStorage)
//   7. Announcement popup dismiss persistence
//
// Usage: node scripts/e2e-interactive.mjs [baseUrl]

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

// --- TMDB fixtures (same shapes as e2e-fixtures.mjs) ------------------------

const MOVIE = {
  id: 603, title: 'Gladiator', overview: 'A former Roman General sets out to exact vengeance.',
  poster_path: '/poster603.jpg', backdrop_path: '/backdrop603.jpg', release_date: '2000-05-05',
  vote_average: 8.2, runtime: 155, imdb_id: 'tt0172495',
  genres: [{ id: 28, name: 'Action' }], genre_ids: [28],
  credits: { cast: [{ id: 1, name: 'Russell Crowe', character: 'Maximus', profile_path: '/c1.jpg', order: 0 }] },
  videos: { results: [{ id: 'v1', key: 'FI1ylg4GKv8', name: 'Trailer', site: 'YouTube', type: 'Trailer' }] },
  similar: { results: [] }, images: { backdrops: [], posters: [] }, release_dates: { results: [] },
}

const SHOW = {
  id: 603, // DELIBERATE: same numeric id as the movie — exercises the collision fix
  name: 'Same Id Show', overview: 'A TV show sharing the movie id 603.',
  poster_path: '/poster-show.jpg', backdrop_path: '/backdrop-show.jpg', first_air_date: '2011-04-17',
  vote_average: 8.4, number_of_seasons: 2, number_of_episodes: 20, episode_run_time: [57],
  genres: [{ id: 18, name: 'Drama' }], genre_ids: [18],
  seasons: [{ id: 1, season_number: 1, episode_count: 10, name: 'Season 1', overview: '', poster_path: null, air_date: '2011-04-17' }],
  credits: { cast: [{ id: 2, name: 'Emilia Clarke', character: 'Dany', profile_path: '/c2.jpg', order: 0 }] },
  videos: { results: [{ id: 'v2', key: 'KPLWWIOCOOQ', name: 'Trailer', site: 'YouTube', type: 'Trailer' }] },
  similar: { results: [] }, images: { backdrops: [], posters: [] }, content_ratings: { results: [] },
}

const SEASON = {
  id: 1, season_number: 1, name: 'Season 1', overview: '', poster_path: null,
  episodes: [
    { id: 11, episode_number: 1, name: 'Pilot', overview: 'ep1', still_path: '/e1.jpg', air_date: '2011-04-17', runtime: 62, vote_average: 8.5 },
  ],
}

const GENRE_LIST = { genres: [{ id: 28, name: 'Action' }, { id: 18, name: 'Drama' }] }

function tmdbFixture(url) {
  const u = new URL(url)
  const path = u.pathname
  if (path.includes('/genre/') && path.endsWith('/list')) return GENRE_LIST
  if (path.includes('/trending/movie/')) return { results: [{ ...MOVIE, media_type: 'movie' }] }
  if (path.includes('/tv/popular')) return { results: [{ ...SHOW, media_type: 'tv' }] }
  if (path.includes('/discover/movie')) return { results: [{ ...MOVIE, media_type: 'movie' }] }
  if (path.includes('/discover/tv')) return { results: [{ ...SHOW, media_type: 'tv' }] }
  if (path.includes('/search/')) {
    return { page: 1, results: [{ ...MOVIE, media_type: 'movie' }, { ...SHOW, media_type: 'tv' }], total_pages: 1, total_results: 2 }
  }
  if (path.endsWith('/movie/603')) return MOVIE
  if (path.endsWith('/tv/603')) return SHOW
  if (path.endsWith('/tv/603/season/1')) return SEASON
  if (path.includes('/tv/603/')) return SHOW
  if (path.includes('/movie/603/')) return MOVIE
  return { results: [] }
}

// --- Harness -----------------------------------------------------------------

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

const pageErrors = []

// Wire request interception + mocking on every page this context opens.
async function wireRequestMocking(p) {
  await p.setRequestInterception(true)
  p.on('request', (req) => {
    const url = req.url()
    // Block the service worker: once registered it calls clients.claim() and
    // its fetch handler re-issues requests itself, bypassing CDP interception
    // — TMDB calls would then hit the real (keyless) proxy instead of the
    // mocks. Aborting the registration keeps every fetch interceptable.
    if (url.includes('/sw.js')) {
      req.abort()
      return
    }
    if (url.includes('api.themoviedb.org') || url.includes('/api/tmdb/')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(tmdbFixture(url)),
      })
    } else if (
      url.includes('image.tmdb.org') || url.includes('youtube.com') || url.includes('fonts.g') ||
      /(vidsrc|cinemaos|vidnest|mapple|cinesrc|videasy|vidfast|vidzee)/.test(url)
    ) {
      req.abort()
    } else {
      req.continue()
    }
  })
}
let page = null

const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Dev-mode Next.js hydrates slowly — SSR HTML renders buttons before React
// attaches handlers, so a fixed short sleep clicks a dead DOM node. Poll for
// the observable effect instead, retrying the action, and only fail when the
// timeout elapses.
async function poll(fn, timeoutMs = 15000, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs
  let lastErr
  while (Date.now() < deadline) {
    try {
      const done = await fn()
      if (done) return true
    } catch (err) {
      lastErr = err
    }
    await sleep(intervalMs)
  }
  if (lastErr) throw lastErr
  return false
}

async function clickButton(matcher) {
  const btn = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.find((b) => !b.disabled)
  })
  return btn
}

async function findButton(textOrLabel) {
  return page.evaluateHandle((needle) => {
    const buttons = [...document.querySelectorAll('button')]
    return typeof needle === 'function'
      ? null // not supported via evaluateHandle serialization
      : buttons.find((b) => b.textContent.replace(/\s+/g, ' ').trim().includes(needle))
  }, textOrLabel)
}

async function test(name, fn) {
  pageErrors.length = 0
  // Each test gets its own incognito context: fully isolated localStorage and
  // service-worker state, mirroring the way the standalone probes ran. A
  // shared long-lived page accumulated React state and SW cache writes that
  // raced the request interception, making tests flake in sequence while
  // passing in isolation.
  const context = await browser.createBrowserContext()
  const testPage = await context.newPage()
  const prevPage = page
  page = testPage
  await wireRequestMocking(page)
  page.on('pageerror', (err) => pageErrors.push(String(err)))
  try {
    await fn()
    const errs = pageErrors.splice(0)
    if (errs.length) {
      results.push([false, name, `pageerror: ${errs.join(' | ')}`])
    } else {
      results.push([true, name, ''])
    }
  } catch (err) {
    pageErrors.splice(0)
    results.push([false, name, String(err).split('\n')[0]])
  } finally {
    await context.close().catch(() => {})
    page = prevPage
  }
}

const text = () => page.evaluate(() => document.body ? document.body.innerText : '')

// 1. Profile (guest) ----------------------------------------------------------
await test('guest /profile client-redirects to the login page', async () => {
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // The redirect is client-side after hydration, so poll for the login form
  // rather than asserting on the pre-hydration SSR text.
  const redirected = await poll(async () => {
    const url = page.url()
    if (!url.includes('/auth/login')) return false
    const body = await text()
    return body.includes('Sign in to your account')
  }, 20000)
  if (!redirected) {
    throw new Error(`expected guest redirect to /auth/login; still on: ${page.url()}`)
  }
})

// 2. Announcement popup dismiss ----------------------------------------------
await test('announcement popup dismisses and stays dismissed', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(1800) // popup opens after 800ms
  const closeBtn = await page.$('button[aria-label="Close announcement"]')
  if (closeBtn) {
    await closeBtn.click()
    await sleep(600)
    const again = await page.$('button[aria-label="Close announcement"]')
    if (again) throw new Error('popup still visible after dismiss')
  }
  // Reload — must not reappear (localStorage flag)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(1800)
  const again2 = await page.$('button[aria-label="Close announcement"]')
  if (again2) throw new Error('popup reappeared after reload despite localStorage flag')
})

// 3. Details MY LIST toggle (guest) -------------------------------------------
await test('details MY LIST adds and removes (guest)', async () => {
  await page.goto(`${BASE}/details?id=603&type=movie`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // Let dev-mode hydration finish before interacting — clicking pre-hydration
  // hits DOM nodes with no React handlers attached.
  await sleep(3000)
  await page.evaluate(() => localStorage.removeItem('watchLater'))

  // Open the status picker and pick "Plan to Watch". Toggle-aware: match the
  // trigger by its aria-controls (its label flips to "<Status> ✓" once an item
  // is saved), and only click it when the menu is closed so retries can't
  // oscillate it. Clicks are synthetic in-page clicks — React receives them
  // reliably, while CDP coordinate clicks can land on an overlay instead.
  const picked = await poll(async () => {
    let menu = await page.$('#watchlist-status-menu')
    if (!menu) {
      await page.evaluate(() => {
        ;[...document.querySelectorAll('button')]
          .find((b) => b.getAttribute('aria-controls') === 'watchlist-status-menu')
          ?.click()
      })
      await sleep(500)
      menu = await page.$('#watchlist-status-menu')
      if (!menu) return false
    }
    await page.evaluate(() => {
      ;[...document.querySelectorAll('#watchlist-status-menu button')]
        .find((b) => b.textContent.includes('Plan to Watch'))
        ?.click()
    })
    return true
  })
  if (!picked) throw new Error('could not open status menu and pick Plan to Watch')

  const added = await poll(async () => {
    const local = await page.evaluate(() => localStorage.getItem('watchLater'))
    return !!local && JSON.parse(local).some((i) => i.id === 603 && (i.type || i.content_type) === 'movie')
  })
  if (!added) throw new Error('item not persisted to localStorage watchLater')
  const body = await text()
  if (!body.includes('✓')) throw new Error('MY LIST did not switch to saved state after add')

  // Remove again via the same menu, same toggle-aware pattern.
  const removed = await poll(async () => {
    let menu = await page.$('#watchlist-status-menu')
    if (!menu) {
      await page.evaluate(() => {
        ;[...document.querySelectorAll('button')]
          .find((b) => b.getAttribute('aria-controls') === 'watchlist-status-menu')
          ?.click()
      })
      await sleep(500)
      menu = await page.$('#watchlist-status-menu')
      if (!menu) return false
    }
    await page.evaluate(() => {
      ;[...document.querySelectorAll('#watchlist-status-menu button')]
        .find((b) => b.textContent.includes('Remove from List'))
        ?.click()
    })
    await sleep(600)
    const local = await page.evaluate(() => localStorage.getItem('watchLater'))
    return !JSON.parse(local || '[]').some((i) => i.id === 603)
  })
  if (!removed) throw new Error('item still in localStorage after remove')
  await page.evaluate(() => localStorage.removeItem('watchLater'))
})

// 4. Watchlist same-id collision fix ------------------------------------------
await test('same-id movie and TV stay distinct in watchlist', async () => {
  await page.goto(`${BASE}/watchlist`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // Seed localStorage directly: two entries sharing content_id 603. (Seeding
  // must happen after navigation — a fresh page is on about:blank, which has
  // no localStorage.)
  await page.evaluate(() => {
    localStorage.setItem('watchLater', JSON.stringify([
      { id: 603, type: 'movie', title: 'Gladiator', poster: '/poster603.jpg', addedAt: new Date().toISOString() },
      { id: 603, type: 'tv', title: 'Same Id Show', poster: '/poster-show.jpg', addedAt: new Date().toISOString() },
    ]))
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(2500)
  const body = await text()
  if (!body.includes('Gladiator') || !body.includes('Same Id Show')) {
    throw new Error(`expected both same-id entries visible; saw: ${body.slice(0, 400)}`)
  }
  const movieLinks = await page.$$eval('a[href*="type=movie"]', (as) => as.length)
  const tvLinks = await page.$$eval('a[href*="type=tv"]', (as) => as.length)
  if (movieLinks === 0 || tvLinks === 0) throw new Error(`missing typed links (movie=${movieLinks}, tv=${tvLinks})`)
  // Clean up
  await page.evaluate(() => localStorage.removeItem('watchLater'))
})

// 5. Search autocomplete -> details deep-link ---------------------------------
await test('autocomplete suggestion opens details page', async () => {
  await page.goto(`${BASE}/search?q=`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // Hydration must finish before typing — pre-hydration keystrokes set the
  // native value without firing React onChange, leaving query state empty.
  await sleep(3000)
  const input = await page.$('input[placeholder*="something in mind"]')
  if (!input) throw new Error('search input not found')
  await input.click()
  await input.type('gla', { delay: 80 })

  // Poll for the dropdown (250ms debounce + mocked fetch). Retype once if the
  // first keystrokes were swallowed by hydration.
  const dropdown = await poll(async () => {
    const value = await page.evaluate(() => document.querySelector('input')?.value || '')
    if (value !== 'gla') {
      const inp = await page.$('input[placeholder*="something in mind"]')
      await inp.click({ clickCount: 3 })
      await inp.type('gla', { delay: 80 })
    }
    // The section header is source-cased "Suggestions" but text-transform
    // variants exist elsewhere; match case-insensitively to be robust.
    return page.evaluate(() => /suggestions/i.test(document.body.innerText))
  }, 20000)
  if (!dropdown) throw new Error('suggestions dropdown did not appear for "gla"')

  const clicked = await poll(async () => {
    const hit = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
      const suggestion = buttons.find(
        (b) => b.textContent.includes('Gladiator') && b.closest('.max-h-\\[70vh\\]')
      )
      if (!suggestion) return false
      suggestion.click()
      return true
    })
    return hit
  })
  if (!clicked) throw new Error('Gladiator suggestion button not clickable in dropdown')

  const navigated = await poll(async () => {
    const url = page.url()
    return url.includes('/details?') && url.includes('type=movie')
  }, 10000)
  if (!navigated) throw new Error(`expected navigation to /details, still on: ${page.url()}`)
  const ok = await poll(async () => {
    const body = await text()
    return body.includes('Gladiator') && body.includes('PLAY')
  }, 15000)
  if (!ok) throw new Error('details page did not render after suggestion click')
})

// 6. Continue watching save + dismiss (guest) ---------------------------------
await test('continue watching entry saves and can be dismissed (guest)', async () => {
  await page.goto(`${BASE}/watch?id=603&type=movie`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.evaluate(() => localStorage.removeItem('continueWatching'))
  await sleep(4000) // SaveProgress saves immediately + on interval
  const stored = await page.evaluate(() => localStorage.getItem('continueWatching'))
  const entries = stored ? JSON.parse(stored) : []
  if (!entries.some((i) => i.content_id === 603 && i.content_type === 'movie')) {
    throw new Error(`no continue-watching entry persisted; stored: ${(stored || 'null').slice(0, 200)}`)
  }
  // Home page shows the row with a dismiss button — poll for the removal since
  // hydration may lag the SSR HTML.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const rowShown = await poll(async () => {
    const body = await text()
    return body.includes('Continue Watching')
  }, 15000)
  if (!rowShown) throw new Error('Continue Watching row missing on home')
  const dismissed = await poll(async () => {
    const dismiss = await page.$('button[title="Remove from continue watching"]')
    if (dismiss) {
      await dismiss.click()
      await sleep(600)
    }
    const after = JSON.parse(await page.evaluate(() => localStorage.getItem('continueWatching') || '[]'))
    return !after.some((i) => i.content_id === 603)
  }, 15000)
  if (!dismissed) throw new Error('entry not removed after dismiss')
  await page.evaluate(() => localStorage.removeItem('continueWatching'))
})

// 7. Settings preferred-source round-trip (guest) ------------------------------
await test('settings preferred source persists (guest)', async () => {
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.evaluate(() => localStorage.removeItem('preferredSource'))
  await sleep(1500)

  const saved = await poll(async () => {
    const hasSelect = await page.evaluate(() => {
      const select = document.querySelector('select')
      if (!select || ![...select.options].some((o) => o.value === 'vidlink')) return false
      // React-controlled select: set value then dispatch a bubbling change so
      // the onChange handler sees it.
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
      setter.call(select, 'vidlink')
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })
    if (!hasSelect) return false
    await sleep(300)
    await page.evaluate(() => {
      ;[...document.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === 'Save Settings')
        ?.click()
    })
    await sleep(800)
    const stored = await page.evaluate(() => localStorage.getItem('preferredSource'))
    return stored === '"vidlink"'
  }, 15000)
  if (!saved) {
    const stored = await page.evaluate(() => localStorage.getItem('preferredSource'))
    throw new Error(`preferredSource not persisted; got: ${stored}`)
  }

  // Reload and confirm the select reflects it
  await page.reload({ waitUntil: 'domcontentloaded' })
  const restored = await poll(async () => {
    const select = await page.$('select')
    if (!select) return false
    const value = await page.$eval('select', (s) => s.value)
    return value === 'vidlink'
  }, 15000)
  if (!restored) {
    const value = await page.$eval('select', (s) => s.value).catch(() => 'no-select')
    throw new Error(`select did not restore saved source; got: ${value}`)
  }
  await page.evaluate(() => localStorage.removeItem('preferredSource'))
})

// --- Report ------------------------------------------------------------------

await browser.close()

let failures = 0
for (const [ok, name, detail] of results) {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? `  —  ${detail}` : ''}`)
  if (!ok) failures++
}
console.log(failures === 0 ? '\nAll interactive flows OK.' : `\n${failures} flow(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
