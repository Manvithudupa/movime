// E2E smoke test — visits every route in headless Chrome and reports
// console errors, uncaught page errors, and failed network requests.
//
// Usage:
//   node scripts/e2e-smoke.mjs [baseUrl]
// (defaults to http://localhost:3000)
//
// Requires the dev/prod server to already be running.

import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:3000'

const ROUTES = [
  '/',
  '/movies',
  '/tv',
  '/anime',
  '/search',
  '/genres',
  '/genre/28?type=movie',
  '/genre/18?type=tv',
  '/search?genre=28&type=movie',
  '/search?genre=18&type=tv',
  '/details?id=603&type=movie',
  '/details?id=1399&type=tv',
  '/watch?id=603&type=movie',
  '/watch?id=1399&type=tv&season=1&episode=1',
  '/watchlist',
  '/settings',
  '/profile',
  '/contact',
  '/about',
  '/privacy',
  '/terms',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/robots.txt',
  '/sitemap.xml',
]

// Find the system Chrome executable.
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

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})

let failures = 0

for (const route of ROUTES) {
  const page = await browser.newPage()
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(String(err)))
  page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText}`))
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`)
  })

  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 45000 })
    // Let client-side fetches (TMDB etc.) settle.
    await new Promise((r) => setTimeout(r, 3000))
  } catch (err) {
    consoleErrors.push(`NAVIGATION FAILED: ${String(err)}`)
  }

  const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 200) : '(no body)')
  const significant = consoleErrors.filter((e) =>
    // Filter expected noise: TMDB/supabase unreachable in local testing.
    !/TMDB|supabase|Failed to fetch|NetworkError|net::|api.themoviedb|placeholder/.test(e)
  )
  const status = significant.length || pageErrors.length ? '❌' : '✅'
  if (status === '❌') failures++

  console.log(`${status} ${route}`)
  if (pageErrors.length) console.log(`    pageerrors: ${pageErrors.join(' | ')}`)
  if (significant.length) console.log(`    console: ${significant.slice(0, 5).join(' | ')}`)
  for (const f of failedRequests.filter((f) => !f.includes('themoviedb') && !f.includes('placeholder.supabase') && !f.includes('fonts.g') && !f.includes('googleapis')).slice(0, 5)) {
    console.log(`    request: ${f}`)
  }

  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nAll pages OK.' : `\n${failures} page(s) had errors.`)
process.exit(failures === 0 ? 0 : 1)
