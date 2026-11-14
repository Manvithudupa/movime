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
| **Framer Motion** | Animation library | Page transitions, card hover effects (`whileHover`, `whileTap`), hero carousel, skeleton loading states, `AnimatePresence` for mount/unmount |
| **CSS Modules** | Scoped styling via `*.module.css` | Vidstack player custom styles in `styles/Vidstackstyles.module.css` |
| **Poppins Font** | Typography | Google Fonts integration with multiple weights (300-800) |
| **CSS Animations** | Custom keyframes | Loading bar, pulse-glow, float, skeleton shimmer, modal fade, glow |
| **Progressive Enhancement** | Graceful fallbacks | Skeleton loaders, error states, loading spinners |
| **Responsive Design** | Mobile-first | Grid layouts, breakpoints at sm/md/lg/xl, touch swipe support for mobile hero, mobile-nav hamburger |

### Animation Skills

- `framer-motion` `AnimatePresence` for mount/unmount transitions
- `motion.div` with `whileHover`, `whileTap`, `whileInView`, `whileDrag`
- Custom `@keyframes` in CSS: `float`, `slide-down`, `glow`, `loading-bar`, `spin-reverse`, `shimmer`, `pulse-glow`
- Tailwind animations: `animate-spin`, `animate-pulse`, `animate-loading-bar`
- Transition orchestration with `delay` and `staggerChildren`

---

## 🗄️ Data & State

| Skill | Purpose | Details |
|-------|---------|---------|
| **Zustand** | State management | 3 stores: `useTitle` (anime title pref), `useNowPlaying` (current episode), `useDataInfo` (anime data) |
| **Supabase** | Database + Auth | PostgreSQL with Row Level Security, auto-profile creation on signup, watchlist with CRUD + status tracking |
| **localStorage** | Client-side persistence | Watch later fallback, user settings, video progress, API cache |

### API Skills

- **TMDB API** — Movie/TV metadata, trending, discover, search, recommendations, season details, content ratings, release dates
- **AniList GraphQL API** — Anime search, character search, episode counts, season breakdown via GraphQL queries
- **FlixHQ API** — Movie/TV/anime streaming sources, episode IDs, subtitles
- **HiAnime API** — Anime streaming sources with sub/dub, intro/outro skip times
- **AnimePahe API** — Anime streaming sources with session-based episode access
- **MegaPlay API** — Alternate anime streaming via iframe embeds (URL construction from HiAnime IDs)

### Data Caching

- In-memory cache (`Map<string, { expiresAt, value }>`) for runtime
- localStorage cache for cross-session persistence
- Configurable TTLs per endpoint (2min-15min)
- Serialized cache keys with `serializeCacheKey()` — handles strings, numbers, and nested objects
- Hybrid architecture: memory check first → localStorage fallback → API fetch

---

## 🔐 Authentication & Users

| Skill | Purpose | Details |
|-------|---------|---------|
| **Supabase Auth** | Authentication | Email/password, OAuth via Supabase, session management with auto-refresh |
| **@supabase/ssr** | Next.js SSR integration | `createBrowserClient` for client, `createServerClient` with cookie-based session for server |
| **Row Level Security** | Data access control | Users can only read/write their own profiles and watchlist items |
| **Profile auto-creation** | Database trigger | `handle_new_user()` trigger on `auth.users` INSERT creates a profile row |
| **Anime character avatar** | Profile feature | AniList character search modal, character data stored as JSONB in profile |
| **Watchlist sync** | Cross-device | Watchlist stored in Supabase with status, auto-syncs on sign-in |

### Auth Flow

1. User signs up via `/auth/signup` or signs in via `/auth/login`
2. Supabase session is managed via cookies (middleware refreshes expired sessions)
3. `AuthProvider` listens to `onAuthStateChange` and provides user/profile context
4. Profile is auto-created on first signup via database trigger
5. Watchlist seamlessly transitions from localStorage to Supabase on sign-in

---

## 🎬 Video Player

| Skill | Purpose | Details |
|-------|---------|---------|
| **Vidstack React** | Video player | `@vidstack/react` v1.12.13 — HLS playback, subtitles, chapters, gestures, keyboard controls |
| **HLS.js** | HLS streaming | Built into Vidstack for m3u8 playback |
| **iframe embeds** | Simple video embed | For providers like AnimePahe, MegaPlay, and all `lib/sources.ts` embed providers |
| **Video Progress** | Resume playback | Custom hook `VideoProgressSave()` tracking currentTime every 5s with localStorage persistence |
| **Skip Intro/Outro** | Anime skips | Button overlay + auto-skip option with VTTCue chapters, togglable via settings |
| **Subtitles** | Multi-language | Automatic English subtitle detection, track formatting for Vidstack, language detection from filenames |
| **CORS Proxy** | Cross-origin streaming | Configurable `NEXT_PUBLIC_PROXY_URI` for proxying m3u8 streams to avoid CORS |
| **Gestures** | Touch/pointer controls | Double-tap seek (-5/+5s), single-tap pause, pointer-up pause/controls toggle |

### Player Architecture

- **PlayerComponent.js** — Orchestrator that fetches sources, formats them for the player, manages providers
- **VidstackPlayer/player.js** — Vidstack wrapper with HLS, subtitles, skip buttons, progress saving, auto-next
- **Iframe fallback** — For providers that don't support direct HLS (AnimePahe, MegaPlay)

---

## 🧩 Components & Patterns

| Skill | Examples |
|-------|----------|
| **React.memo** | `ContentCard` (app/page.tsx + ContentSection.tsx) — prevents unnecessary re-renders in content rows |
| **useCallback** | Memoized handlers: `addToWatchLater`, `isInWatchLater`, `loadWatchLater`, `loadContent`, `loadSeasonData` |
| **useMemo** | `filteredContent` — computed content with genre/year filters |
| **useRef** | `isLoadingMoreRef`, `playerRef`, `intervalRef`, `autoNextRef`, `initFromQueryRef` |
| **dynamic import** | `PlayerComponent` with `ssr: false` for client-only video components |
| **Suspense** | `Suspense` boundaries for pages using `useSearchParams` (watch, details, home) |
| **Lazy loading** | Images with `loading="lazy"` and `priority` for hero images |
| **Intersection Observer** | Framer Motion's `whileInView` with `viewport={{ once: true }}` for scroll-triggered animations |
| **Error Boundaries** | try/catch at every API call level with fallback UI and toast notifications |
| **Accessibility** | `tabIndex`, `role="button"`, `aria-label`, `aria-current`, keyboard navigation (Enter/Space), focus-visible rings |

---

## 📱 Progressive Web App

| Skill | Details |
|-------|---------|
| **next-pwa** | PWA configuration via `next-pwa.config.js` |
| **Service Worker** | Auto-generated by Workbox, registered in `layout.tsx` via inline Script |
| **Web App Manifest** | `public/manifest.json` with icons, colors (purple theme `#A17FC0`), display modes |
| **Offline support** | Basic service worker caching with network-first strategy |
| **Theme color** | Purple theme (`#A17FC0`) for PWA status bar |
| **Icons** | 192x192 and 512x512 icons, generated via `scripts/generate-icons.js` using Sharp |

---

## 🔧 Developer Tools

| Skill | Purpose |
|-------|---------|
| **ESLint** | Code quality with Next.js and TypeScript rules |
| **TypeScript strict** | Full strict mode with `noEmit`, `bundler` module resolution |
| **PostCSS** | CSS processing with Tailwind and Autoprefixer plugins |
| **Sharp** | Image optimization and icon generation |
| **Vercel** | Deployment platform with Analytics and Speed Insights |
| **Supabase Dashboard** | Database management, SQL editor, auth configuration |

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

**16 verified embed providers** for movies and TV shows (each live-checked; dead providers such as RiveStream, AutoEmbed, 2Embed, 123Embed, Flicky, VidSrcDEV, VidStreamPro, SuperEmbed, MultiEmbed, and Hexa were removed):

| Source | Domain | Type | Sandbox |
|--------|--------|------|---------|
| CinemaOS | cinemaos.in | Movie/TV | Requires NoSandbox |
| VidNest | vidnest.fun | Movie/TV | Requires NoSandbox |
| MappleTV | mapple.rip | Movie/TV | Requires NoSandbox |
| VidSrcRIP | vidsrc.rip | Movie/TV | Requires NoSandbox |
| VidSrcSU | vidsrc.su | Movie/TV | Requires NoSandbox |
| VidSrcSBS | vidsrc.sbs | Movie/TV | Requires NoSandbox |
| VidSrcME | vidsrcme.ru | Movie/TV | Requires NoSandbox |
| VidSrcNL | vidsrc.nl | Movie/TV | Requires NoSandbox |
| VidSrcPM | vidsrc.pm | Movie/TV | Requires NoSandbox |
| VidLink | vidlink.pro | Movie/TV | Requires NoSandbox |
| VidEasy | player.videasy.net | Movie/TV | Requires NoSandbox |
| VidFast | vidfast.pro | Movie/TV | Requires NoSandbox |
| VidZee | player.vidzee.wtf | Movie/TV | Requires NoSandbox |
| CineSrc | cinesrc.st | Movie/TV | Requires NoSandbox |
| P-Stream | pstream.cfd | Movie/TV | Requires NoSandbox |
| Spenflix | spenflix.world | Movie/TV | Requires NoSandbox |

### Anime Streaming Providers (server-side)

| Provider | Type | Media | API |
|----------|------|-------|-----|
| FlixHQ | HLS m3u8 (Vidstack) | Movies, TV, Anime | REST API proxy (`getFlixHQSources`) |
| HiAnime | HLS m3u8 (Vidstack) | Anime (sub/dub) | REST API proxy (`getHiAnimeSources`) |
| AnimePahe | iframe embed | Anime | REST API proxy (`getAnimePaheSources`) |
| MegaPlay | iframe embed | Anime | URL construction from HiAnime IDs (`getMegaPlaySources`) |

---

## 🎯 Content Categories

| Category | Data Source | Filtering |
|----------|-------------|-----------|
| Trending Movies | TMDB `/trending/movie/day` | Adult filter (keywords + adult flag), blocked IDs (50+) |
| Popular TV | TMDB `/tv/popular` | Adult filter |
| Hollywood | TMDB discover (en, US region) | Adult filter, blocked IDs |
| Bollywood | TMDB discover (hi, IN region) | Adult filter, blocked IDs |
| Anime | TMDB discover (genre 16, JP) + AniList enhancement | Adult filter, blocked IDs |
| Netflix | TMDB watch provider 8 + company 2452 fallback | Adult filter, blocked IDs |
| Amazon Prime | TMDB watch provider 119 + company 1024 + genre fallback | Adult filter, blocked IDs |

### Content Filtering

- **Adult Content Filter** — Keyword-based (title + overview) and rating-based (`adult` flag), genre-based heuristics
- **Blocked Movie IDs** — Predefined list of 50+ blocked content IDs
- **Anime Detection** — Genre (animation) + keyword (anime/manga) + origin country (JP) heuristics
- **Anime Enhancement** — When anime detected, fetches AniList data for accurate season/episode mapping

---

## 🧪 Known Patterns & Conventions

### Error Handling

- All API fetch functions wrapped in try/catch with fallback return values (`{ results: [] }`)
- Server actions return `null` on failure (callers handle gracefully)
- Toast notifications for user-facing errors (sonner)
- Client components check data existence before rendering
- API routes return consistent JSON error responses with status codes

### Performance Patterns

- `React.memo` on card components to prevent list re-renders
- `useCallback` for props passed to child components
- `useMemo` for computed/filtered data
- Debounced search (500ms timeout)
- Image lazy loading with `loading="lazy"`
- API caching with in-memory + localStorage hybrid approach (10min TTL default)
- Dynamic imports for heavy components (`PlayerComponent`)
- Preconnect to Google Fonts for faster font loading

### Security Patterns

- TMDB API key bundled client-side (public API, design choice)
- Supabase RLS ensures users can only access their own data
- Session refresh via middleware (handles expired sessions)
- Content Security Policy headers via Next.js config
- iframe sandboxing for embed sources (`allow-scripts`, `allow-same-origin`, etc.)
- Adult content filtering on all API responses
- Service worker only registers on localhost or HTTPS

### Database Schema (supabase)

- **`profiles`** — Extends `auth.users` with name, email, avatar, bio, gender, location, website, anime_character, settings
- **`watch_later`** — User watchlist with content_id, content_type (movie/tv), title, poster_path, status (watching/completed/plan_to_watch/dropped)
- **RLS Policies** — Per-row access control for profiles and watchlist
- **Auto-profile trigger** — `handle_new_user()` function creates profile on signup

### Style Conventions

- `backdrop-blur-sm` for glass-morphism effects on overlays
- `bg-white/[opacity]` for white-on-black with variable opacity
- `border border-white/[opacity]` for subtle borders
- `transition-all duration-150` for micro-interactions
- `line-clamp-{n}` for text truncation
- `scrollbar-hide` for horizontal scrollable content rows
- Consistent black background with white/gray text hierarchy
