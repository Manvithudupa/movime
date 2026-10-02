// Live health probe for the embed providers in lib/sources.ts.
//
// For every non-commented source it builds the movie and TV embed URLs from
// TMDB fixtures and frames each one exactly the way /watch does (cross-origin
// <iframe> in a blank page), then reports what happened:
//
//   PLAYER  — a <video> element appeared somewhere in the frame tree
//   BLOCKED — the provider refused framing (X-Frame-Options / CSP frame-ancestors)
//   DNS/ERR — navigation failed (domain down, TLS, timeout…)
//   EMPTY   — frame loaded but no player and no obvious error
//
// Usage: node scripts/verify-sources.mjs [concurrency]

import puppeteer from 'puppeteer-core'
import { existsSync, readFileSync } from 'node:fs'

const CONCURRENCY = Number(process.argv[2]) || 3
const MOVIE_ID = 603 // Gladiator
const TV_ID = 1399 // Game of Thrones
const TV_SEASON = 1
const TV_EPISODE = 1
const WAIT_MS = 11000

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

// --- Parse lib/sources.ts (skip commented-out entries) ----------------------

function loadSources() {
  const lines = readFileSync('lib/sources.ts', 'utf8').split(/\r?\n/)
  const entries = []
  let cur = null
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('//')) continue
    const idm = t.match(/^id:\s*'([^']+)'/)
    if (idm) {
      if (cur) entries.push(cur)
      cur = { id: idm[1], name: idm[1] }
      continue
    }
    if (!cur) continue
    const nm = t.match(/^name:\s*'([^']+)'/)
    if (nm) cur.name = nm[1]
    const mm = t.match(/^movie:\s*'([^']+)'/)
    if (mm) cur.movie = mm[1]
    const tm = t.match(/^tv:\s*'([^']+)'/)
    if (tm) cur.tv = tm[1]
  }
  if (cur) entries.push(cur)
  return entries
}

function build(url, { id, season, episode }) {
  return url
    .replace('{id}', encodeURIComponent(String(id)))
    .replace('{season}', encodeURIComponent(String(season)))
    .replace('{episode}', encodeURIComponent(String(episode)))
}

// --- Probe ------------------------------------------------------------------

async function probe(browser, label, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
  )
  await page.setViewport({ width: 1280, height: 720 })

  const consoleErrors = []
  const failures = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('requestfailed', (req) => {
    const err = req.failure()?.errorText || 'failed'
    if (!err.includes('ERR_ABORTED')) failures.push(`${err} ${req.url().slice(0, 90)}`)
  })

  const result = { label, url, status: 'EMPTY', detail: '' }
  try {
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
    await page.evaluate((src) => {
      const f = document.createElement('iframe')
      f.id = 'probe'
      f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture')
      f.setAttribute('allowfullscreen', '')
      f.src = src
      f.style.cssText = 'width:1280px;height:720px;border:0'
      document.body.appendChild(f)
    }, url)

    // Give ads/redirects/player boot a generous window.
    await new Promise((r) => setTimeout(r, WAIT_MS))

    const handle = await page.$('#probe')
    const frame = handle ? await handle.contentFrame() : null

    let frameTitle = ''
    let videoInfo = null
    let bodyText = ''
    if (frame && frame !== page.mainFrame()) {
      try {
        const info = await frame.evaluate(() => {
          const videos = [...document.querySelectorAll('video')]
          const first = videos[0]
          return {
            title: document.title,
            body: document.body ? document.body.innerText.slice(0, 300) : '',
            videoCount: videos.length,
            readyState: first ? first.readyState : -1,
            currentSrc: first ? (first.currentSrc || first.src || '').slice(0, 120) : '',
          }
        })
        frameTitle = info.title
        bodyText = info.body
        videoInfo = info
      } catch (err) {
        result.detail = `frame eval failed: ${String(err).split('\n')[0].slice(0, 80)}`
      }
    }

    const topBlocked = consoleErrors.find((m) => /X-Frame-Options|frame-ancestors|Refused to display/i.test(m))
    const navFailed = failures.find((f) => /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_TIMED_OUT|ERR_SSL|ERR_CERT/i.test(f))

    if (navFailed) {
      result.status = 'DNS/ERR'
      result.detail = navFailed.slice(0, 90)
    } else if (videoInfo && videoInfo.videoCount > 0) {
      result.status = 'PLAYER'
      result.detail = `video×${videoInfo.videoCount} readyState=${videoInfo.readyState}${videoInfo.currentSrc ? ' src=' + videoInfo.currentSrc.split('/')[2] : ''}`
    } else if (topBlocked) {
      result.status = 'BLOCKED'
      result.detail = topBlocked.slice(0, 100)
    } else {
      result.detail = (bodyText || frameTitle || 'no player, no error text').replace(/\s+/g, ' ').slice(0, 100)
    }
  } catch (err) {
    result.status = 'DNS/ERR'
    result.detail = String(err).split('\n')[0].slice(0, 100)
  } finally {
    await context.close().catch(() => {})
  }
  return result
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

// --- Run --------------------------------------------------------------------

const sources = loadSources()
console.log(`Probing ${sources.length} sources (movie id ${MOVIE_ID}, tv ${TV_ID}/${TV_SEASON}/${TV_EPISODE})…\n`)

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
})

const jobs = []
for (const s of sources) {
  if (s.movie) jobs.push({ source: s, kind: 'movie', url: build(s.movie, { id: MOVIE_ID }) })
  if (s.tv) jobs.push({ source: s, kind: 'tv', url: build(s.tv, { id: TV_ID, season: TV_SEASON, episode: TV_EPISODE }) })
}

const results = await mapLimit(jobs, CONCURRENCY, (job) =>
  probe(browser, `${job.source.id} [${job.kind}]`, job.url).then((r) => ({ ...r, sourceId: job.source.id }))
)

await browser.close()

const icon = { PLAYER: '✅', BLOCKED: '⛔', 'DNS/ERR': '❌', EMPTY: '⚠️' }
for (const r of results) {
  console.log(`${icon[r.status] || '?'} ${r.label.padEnd(22)} ${r.status.padEnd(8)} ${r.detail}`)
}

// Per-source roll-up: a source is dead if either stream fails hard.
const bySource = {}
for (const r of results) {
  ;(bySource[r.sourceId] ||= []).push(r)
}
console.log('\n--- roll-up ---')
const dead = []
for (const [id, rs] of Object.entries(bySource)) {
  const statuses = rs.map((r) => r.status)
  const hardFail = statuses.includes('DNS/ERR') || statuses.includes('BLOCKED')
  const anyPlayer = statuses.includes('PLAYER')
  const verdict = hardFail && !anyPlayer ? 'DEAD' : anyPlayer ? 'OK' : 'UNCLEAR'
  if (verdict === 'DEAD') dead.push(id)
  console.log(`${verdict.padEnd(8)} ${id.padEnd(16)} ${statuses.join(', ')}`)
}
console.log(`\nDead: ${dead.length ? dead.join(', ') : '(none)'}`)
