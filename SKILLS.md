# Skills & Technologies

This document catalogs every technology, tool, library, and skill used in the Movime project.

---

## 🚀 Core Framework

| Skill | Version | Purpose | Proficiency |
|-------|---------|---------|-------------|
| **Next.js** | 15.3.8 | React framework with App Router, file-based routing, server actions, and RSC | Core |
| **React** | 18.x | UI component library for building the interface | Core |
| **TypeScript** | 5.x | Type-safe JavaScript with strict mode enabled | Core |
| **Node.js** | 18+ | JavaScript runtime for development and build | Core |

---

## 🎨 Styling & UI

| Skill | Purpose | Details |
|-------|---------|---------|
| **Tailwind CSS** | Utility-first CSS framework | Custom theme with extended animations, responsive breakpoints |
| **Framer Motion** | Animation library | Page transitions, card hover effects, hero carousel, skeleton loading states |
| **CSS Modules** | Scoped styling via `*.module.css` | Vidstack player custom styles in `styles/Vidstackstyles.module.css` |
| **Poppins Font** | Typography | Google Fonts integration with multiple weights (300-800) |
| **CSS Animations** | Custom keyframes | Loading bar, pulse-glow, float, skeleton shimmer, modal fade, glow |
| **Progressive Enhancement** | Graceful fallbacks | Skeleton loaders, error states, loading spinners |
| **Responsive Design** | Mobile-first | Grid layouts, breakpoints at sm/md/lg/xl, touch swipe support for mobile hero |

### Animation Skills

- `framer-motion` `AnimatePresence` for mount/unmount transitions
- `motion.div` with `whileHover`, `whileTap`, `whileInView`
- Custom `@keyframes` in CSS: `float`, `slide-down`, `glow`, `loading-bar`, `spin-reverse`, `shimmer`, `pulse-glow`
- Tailwind animations: `animate-spin`, `animate-pulse`, `animate-loading-bar`
- Transition orchestration with `delay` and `staggerChildren`

---

## 🗄️ Data & State

| Skill | Purpose | Details |
|-------|---------|---------|
| **Zustand** | State management | 3 stores: `useTitle` (anime title pref), `useNowPlaying` (current episode), `useDataInfo` (anime data) |
| **Prisma** | ORM | PostgreSQL database with User, Account, Session, VerificationToken models |
| **PostgreSQL** | Database | Production database hosted on Vercel/Neon |
| **localStorage** | Client-side persistence | Watch later list, user settings, video progress, API cache |

### API Skills

- **TMDB API** — Movie/TV metadata, trending, discover, search, recommendations, season details
- **AniList GraphQL API** — Anime search, episode counts, season breakdown via GraphQL queries
- **FlixHQ API** — Movie/TV/anime streaming sources, episode IDs, subtitles
- **HiAnime API** — Anime streaming sources with sub/dub, intro/outro skip times
- **AnimePahe API** — Anime streaming sources with session-based episode access
- **MegaPlay API** — Alternate anime streaming via iframe embeds

### Data Caching

- In-memory cache (`Map<string, { expiresAt, value }>`) for runtime
- localStorage cache for cross-session persistence
- Configurable TTLs per endpoint (2min-15min)
- Serialized cache keys with `serializeCacheKey()`

---

## 🔐 Authentication & Users

| Skill | Purpose | Details |
|-------|---------|---------|
| **Clerk** | Authentication | Multi-provider auth (Google, GitHub, email), user management |
| **@clerk/nextjs** | Next.js integration | `ClerkProvider`, `useUser`, `UserButton`, `SignInButton`, `SignUpButton`, `currentUser()` |
| **Svix** | Webhook verification | Clerk webhook signature verification for user sync |
| **Prisma + Clerk sync** | Database sync | Webhook-based user CRUD (create, update, delete) synced to PostgreSQL |
| **Avatar upload** | Profile images | Base64 upload (dev) with API routes for GET/POST/DELETE |

---

## 🎬 Video Player

| Skill | Purpose | Details |
|-------|---------|---------|
| **Vidstack React** | Video player | `@vidstack/react` v1.12.13 — HLS playback, subtitles, chapters, gestures |
| **HLS.js** | HLS streaming | Built into Vidstack for m3u8 playback |
| **iframe embeds** | Simple video embed | For providers like AnimePahe, MegaPlay, and all `lib/sources.ts` providers |
| **Video Progress** | Resume playback | Custom hook `VideoProgressSave()` tracking currentTime every 5s with localStorage persistence |
| **Skip Intro/Outro** | Anime skips | Button overlay + auto-skip option with VTTCue chapters |
| **Subtitles** | Multi-language | Automatic English subtitle detection, track formatting for Vidstack |
| **CORS Proxy** | Cross-origin streaming | Configurable `NEXT_PUBLIC_PROXY_URI` for m3u8 streams |

---

## 🧩 Components & Patterns

| Skill | Examples |
|-------|----------|
| **React.memo** | `ContentCard` (app/page.tsx + ContentSection.tsx) — prevents unnecessary re-renders |
| **useCallback** | Memoized handlers: `addToWatchLater`, `isInWatchLater`, `loadWatchLater` |
| **useMemo** | `filteredContent` — computed content with filters applied |
| **useRef** | `isLoadingMoreRef`, `playerRef`, `intervalRef`, `autoNextRef`, `runtimeCache`, `lastBasicResults` |
| **dynamic import** | `PlayerComponent` with `ssr: false` for client-only video components |
| **Suspense** | `Suspense` boundaries for pages using `useSearchParams` (watch, details, home) |
| **Lazy loading** | Images with `loading="lazy"` and `priority` for hero images |
| **Intersection Observer** | Framer Motion's `whileInView` for scroll-triggered animations |
| **Error Boundaries** | try/catch at every API call level with fallback UI |
| **Accessibility** | `tabIndex`, `role="button"`, `aria-label`, `aria-current`, keyboard navigation |

---

## 📱 Progressive Web App

| Skill | Details |
|-------|---------|
| **next-pwa** | PWA configuration via `next-pwa.config.js` |
| **Service Worker** | Auto-generated by Workbox, registered in layout.tsx |
| **Web App Manifest** | `public/manifest.json` with icons, colors, display modes |
| **Offline support** | Basic service worker caching |
| **Theme color** | Purple theme (`#8A2BE2`) for PWA status bar |
| **Icons** | 192x192 and 512x512 with maskable variants, generated via `scripts/generate-icons.js` |

---

## 🔧 Developer Tools

| Skill | Purpose |
|-------|---------|
| **ESLint** | Code quality with Next.js and TypeScript rules |
| **TypeScript strict** | Full strict mode with `noEmit`, `bundler` module resolution |
| **PostCSS** | CSS processing with Tailwind and Autoprefixer plugins |
| **Sharp** | Image optimization for production builds |
| **Vercel** | Deployment platform with Analytics and Speed Insights |
| **Prisma Studio** | Database GUI (`npx prisma studio`) |

### Unused Dependencies (present in package.json, not directly imported)

| Package | Reason |
|---------|--------|
| `claude` ^0.1.1 | Anthropic Claude SDK — not used anywhere in the codebase |
| `components/Avatar.tsx` | Exists in project tree but not imported by any component/page |

---

### ESLint Configuration

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-require-imports": "off",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 🔌 Streaming Sources (lib/sources.ts)

**21 embed providers** — all confirmed HTTP 200 for movie and TV embed paths:

| Source | Domain | Type | Sandbox | Verified |
|--------|--------|------|---------|----------|
| CinemaOS | cinemaos.tech | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidNest | vidnest.fun | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| MappleTV | mapple.rip | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| RiveStream | rivestream.ru | Movie/TV | None | ✅ HTTP 200 |
| AutoEmbed | autoembed.co | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidLink | vidlink.pro | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcSU | vidsrc.su | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| 2Embed | www.2embed.cc | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| 123Embed | play2.123embed.net | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidEasy (4K) | player.videasy.to | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidFast (4K) | vidfast.vc | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcSBS | vidsrc.sbs | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcRIP | vidsrc.rip | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcPM | vidsrc.pm | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcME | vidsrcme.ru | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcNL | vidsrc.nl | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidSrcDEV | vidsrc.dev | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| Flicky | flicky.host | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidStreaming | vidstreaming.io | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidStreamPro | vidstream.pro | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |
| VidZee | player.vidzee.wtf | Movie/TV | Requires NoSandbox | ✅ HTTP 200 |

### Anime Streaming Providers (server-side)

| Provider | Type | Media | API |
|----------|------|-------|-----|
| FlixHQ | HLS m3u8 | Movies, TV, Anime | REST API proxy |
| HiAnime | HLS m3u8 | Anime (sub/dub) | REST API proxy |
| AnimePahe | iframe embed | Anime | REST API proxy |
| MegaPlay | iframe embed | Anime | URL construction from HiAnime IDs |

---

## 🎯 Content Categories

| Category | Data Source | Filtering |
|----------|-------------|-----------|
| Trending Movies | TMDB `/trending/movie/day` | Adult filter, blocked IDs |
| Popular TV | TMDB `/tv/popular` | Adult filter |
| Hollywood | TMDB discover (en, US) | Adult filter, blocked IDs |
| Bollywood | TMDB discover (hi, IN) | Adult filter, blocked IDs |
| Anime | TMDB discover (genre 16, JP) + AniList | Adult filter, blocked IDs |
| Netflix | TMDB discover (provider 8) + fallback | Adult filter, blocked IDs |
| Amazon Prime | TMDB discover (provider 119) + fallbacks | Adult filter, blocked IDs |

### Content Filtering

- **Adult Content Filter** — Keyword-based (title + overview) and rating-based (`adult` flag)
- **Blocked Movie IDs** — Predefined list of 50+ blocked content IDs
- **Search Filtering** — Year filter (≥2004), reality TV filter, relevance scoring with minimum threshold
- **Runtime Filtering** — Background enrichment fetches runtime, filters out short content (<40min)

---

## 🧪 Known Patterns & Conventions

### Error Handling

- All API fetch functions wrapped in try/catch with fallback return values (`{ results: [] }`)
- Server actions return `null` on failure (callers handle gracefully)
- Toast notifications for user-facing errors (sonner)
- Client components check data existence before rendering

### Performance Patterns

- `React.memo` on card components to prevent list re-renders
- `useCallback` for props passed to child components
- `useMemo` for computed/filtered data
- Debounced search (500ms timeout)
- Image lazy loading with `loading="lazy"`
- API caching with in-memory + localStorage hybrid approach
- Dynamic imports for heavy components (`PlayerComponent`)

### Security Patterns

- API keys only used server-side (TMDB key in `lib/utils.ts` is client-accessible by design)
- Clerk webhook verification via Svix
- Content Security Policy headers via Next.js config
- X-Frame-Options `SAMEORIGIN` to prevent clickjacking
- iframe sandboxing for embed sources
- Adult content filtering on all API responses
