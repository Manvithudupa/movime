# Movime 🎬

<p align="center">
  <img src="public/logo.png" alt="Movime Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Click, watch, enjoy.</strong> Movime is a free streaming platform that aggregates movies, TV shows, and anime from multiple third-party sources into one seamless interface.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/next.js-15.3-black?style=flat-square&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.3-06B6D4?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-FF6600?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/license-educational-lightgrey?style=flat-square" alt="License" />
</p>

---

> **Disclaimer:** Movime does not host or store any media files. All content is sourced from third-party providers and is intended for educational and informational use only.

---

## ✨ Features

- **🎥 Multi-Source Streaming** — Watch content from 21 embed providers with automatic source switching
- **🎞️ Vidstack HLS Player** — High-quality native HLS video player with subtitles, chapters, and seek controls
- **📺 TV Shows & Seasons** — Browse episodes with season selectors and episode detail cards
- **🐱 Anime Integration** — Dedicated anime section with AniList+TMDB cross-referencing for accurate season/episode mapping
- **🏠 Anime Hero Banner** — Dedicated anime hero carousel section for anime content
- **⏭️ Skip Intro/Outro** — Auto-skip option for anime openings and endings with smart detection
- **🔍 Smart Search** — Full-text search with relevance scoring, live autocomplete, recent searches, trending suggestions, year/genre filtering, and adult content filtering
- **🔖 Watch Later** — Save content with status tracking (Watching, Completed, Plan to Watch, Dropped), synced across devices via Supabase
- **👤 User Accounts** — Supabase-powered authentication with profile management (avatar, bio, anime character picker)
- **🌈 Anime Title Preferences** — Switch between romaji, english, or native title display
- **📱 Progressive Web App** — Installable on mobile and desktop with offline service worker
- **⚡ Video Progress** — Auto-resume playback from where you left off with progress persistence
- **🔄 Source Fallback** — Automatic source switching if a provider fails
- **🔞 Content Filtering** — Adult content and blocked content filtering for a safe experience
- **📈 Trending & Categories** — Hollywood, Bollywood, Netflix Originals, Amazon Prime sections
- **🚀 Optimized Performance** — API response caching, in-flight request deduplication, and localStorage persistence for fast loads

---

## 🖥️ Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage with 7 content sections (Trending Movies, TV Shows, Hollywood, Bollywood, Anime, Netflix, Amazon Prime) and hero carousel |
| `/details?id=&type=` | Content detail page with poster, info, watchlist management, season/episode browser, recommendations |
| `/watch?id=&type=` | Watch page with iframe-based video player and source selector sidebar |
| `/search` | Dedicated search page with sorting (relevance, popularity, rating, year, title) |
| `/settings` | User preferences (preferred source, default quality, auto-play, data management) |
| `/profile` | User profile management with anime character picker (requires authentication) |
| `/watchlist` | Full watchlist page with status filtering (Watching, Completed, Plan to Watch, Dropped) |
| `/contact` | Contact form and support information |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/about` | About Movime |

### Auth Pages

| Route | Description |
|-------|-------------|
| `/auth/login` | Sign in with email/password |
| `/auth/signup` | Create a new account |
| `/auth/callback` | OAuth callback handler for Supabase |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/watchlist` | GET | Fetch user's watchlist items |
| `/api/watchlist` | POST | Add item to watchlist (or toggle if exists) |
| `/api/watchlist` | PATCH | Update item status |
| `/api/watchlist` | DELETE | Remove item from watchlist |
| `/api/user/profile` | GET/PUT | Fetch or update user profile |
| `/api/anilist/character?q=` | GET | Search AniList anime characters |

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router, server actions, and RSC |
| **TypeScript** | Type-safe development with strict mode |
| **Tailwind CSS** | Utility-first styling with custom animations |
| **Supabase** | Authentication, PostgreSQL database, Row Level Security |
| **Vidstack** | HLS video player with subtitles, chapters, seek controls |
| **Zustand** | Lightweight state management (title preferences, now-playing info) |
| **Framer Motion** | Page transitions, card hover animations, hero carousel, skeleton loading |
| **TMDB API** | Movie/TV show metadata, images, recommendations |
| **AniList API** | Anime character search, season breakdown, episode mapping |
| **sonner** | Toast notifications |
| **next-pwa** | Progressive Web App support |
| **Vercel Analytics** | Usage analytics and speed insights |

### Streaming Providers (iframe embed)

The platform aggregates from **21 embed providers** including VidLink, AutoEmbed, VidSrcSU, VidSrcSBS, VidSrcRIP, VidSrcPM, VidSrcME, VidSrcNL, VidSrcDEV, Flicky, VidStreaming, VidStreamPro, 2Embed, 123Embed, VidEasy, VidFast, CinemaOS, VidNest, MappleTV, RiveStream, and VidZee.

### Anime Streaming (server actions)

Anime episodes are fetched via server actions using **FlixHQ**, **HiAnime**, **AnimePahe**, and **MegaPlay** APIs — proxied through a configurable CORS proxy to avoid browser restrictions.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/bun
- Supabase project (for authentication and database)
- TMDB API key ([get one free](https://www.themoviedb.org/settings/api))

### Installation

```bash
# Clone the repository
git clone https://github.com/Manvith911/movime.git
cd movime

# Install dependencies
npm install
# or
bun install

# Set up environment variables
# Create a .env.local file with the variables shown below
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase (required for authentication & watchlist sync)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anime streaming APIs (optional - for anime playback)
FLIXHQ_API_URL=https://your-flixhq-proxy.com
ANIMEPAHE_API_URL=https://your-animepahe-proxy.com
NEXT_PUBLIC_PROXY_URI=https://cors-proxy.your-domain.com/

# Image proxy (optional - for privacy/caching)
NEXT_PUBLIC_IMAGE_PROXY=https://images.weserv.nl/?url=
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `lib/supabase/schema.sql` in the Supabase SQL Editor
3. Enable email/password auth in Authentication → Providers
4. Copy your project URL and anon key to `.env.local`

### Development

```bash
# Start dev server
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## 🏗️ Project Structure

```
movime/
├── app/
│   ├── about/          # About page
│   ├── actions/        # Server actions (source.js)
│   ├── api/
│   │   ├── anilist/    # AniList character search API
│   │   ├── user/       # User profile API
│   │   └── watchlist/  # Watchlist CRUD API
│   ├── auth/           # Login, signup, callback pages
│   ├── contact/        # Contact page
│   ├── details/        # Content detail page with watchlist management
│   ├── privacy/        # Privacy policy
│   ├── profile/        # User profile page with anime character picker
│   ├── search/         # Search page with sort/filter
│   ├── settings/       # User settings page
│   ├── terms/          # Terms of service
│   ├── watch/          # Watch/player page
│   ├── watchlist/      # Full watchlist management page
│   ├── layout.tsx      # Root layout (AuthProvider, PWA, fonts, analytics)
│   ├── page.tsx        # Homepage
│   └── globals.css     # Global styles & animations
├── components/
│   ├── AniListCharacterPicker.tsx  # Modal for picking anime character avatar
│   ├── AnimeHero.tsx              # Anime carousel hero banner
│   ├── AuthProvider.tsx           # Supabase auth context provider
│   ├── Avatar.tsx                 # User avatar with fallback initials
│   ├── ContentSection.tsx         # Horizontal scrollable content row
│   ├── Footer.tsx                 # App footer with disclaimer
│   ├── HeroSection.tsx            # Hero carousel (featured movies)
│   ├── LoadingBar.tsx             # Route loading indicator
│   ├── Navbar.tsx                 # Navigation bar with user menu
│   ├── PlayerComponent.js         # Video player orchestrator
│   ├── PlayerEpisodeList.js       # Episode list for video player
│   ├── ProxyImage.tsx             # Image proxy wrapper (privacy/caching)
│   ├── SkeletonCard.tsx           # Loading skeleton placeholders
│   ├── Toaster.tsx                # Toast notifications (sonner)
│   └── VidstackPlayer/            # Vidstack HLS player component
├── lib/
│   ├── animeMapper.ts   # AniList + TMDB anime season mapping
│   ├── sources.ts       # 21 available embed streaming sources
│   ├── store.ts         # Zustand stores (title prefs, now-playing)
│   ├── supabase/
│   │   ├── client.ts    # Supabase browser client
│   │   ├── server.ts    # Supabase server client (cookies)
│   │   ├── middleware.ts # Supabase session refresh middleware
│   │   └── schema.sql   # Database schema (profiles, watch_later)
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # API functions, caching, content filtering
├── public/              # Static assets, PWA manifest, icons
├── scripts/             # Build scripts (icon generation)
├── styles/              # Vidstack custom CSS module
├── utils/
│   ├── logger.ts        # Development-only logger
│   └── VideoProgressSave.js  # Watch progress persistence hook
├── middleware.ts        # Supabase session refresh middleware
├── package.json
├── next.config.js       # Next.js + PWA config
├── tailwind.config.js   # Tailwind theme
└── tsconfig.json        # TypeScript config
```

---

## 🎮 Usage

### Watching Content

1. Browse content on the homepage or use search
2. Click any card to go to the detail page
3. Click **Play** or go directly via `/watch?id=123&type=movie`
4. If a source fails, manually switch sources from the source sidebar
5. For TV shows, select season and episode before watching

### Watchlist Management

1. On any detail page, click **+ MY LIST** to add content
2. Choose a status: Watching, Completed, Plan to Watch, or Dropped
3. Click the button again to update status or remove from list
4. View and filter your full watchlist at `/watchlist`

### Search Tips

- Type any movie/TV show/anime name
- Search results are relevance-sorted
- Use the sort menu to sort by popularity, rating, year, or title
- Content is filtered for appropriate audiences by default
- Search by year using the year filter dropdown

### Anime Viewing

- Navigate to the **Anime** section on the homepage
- Click any anime to see details with enhanced season/episode breakdown
- Anime episodes are fetched from FlixHQ/HiAnime/AnimePahe/MegaPlay providers
- Skip intro/outro buttons appear during anime playback

---

## 🔧 Configuration

### Adding Streaming Sources

Edit `lib/sources.ts` to add or remove embed providers:

```typescript
{
  id: 'mysource',
  name: 'My Source',
  isFrench: false,
  requiresNoSandbox: true, // set false for secure mode filtering
  urls: {
    movie: 'https://example.com/embed/movie/{id}',
    tv: 'https://example.com/embed/tv/{id}/{season}/{episode}'
  }
}
```

The `{id}`, `{season}`, and `{episode}` placeholders are automatically replaced.

### Anime Provider APIs

Anime sources are fetched server-side via `app/actions/source.js`. Each provider (FlixHQ, HiAnime, AnimePahe, MegaPlay) requires its own API proxy URL configured in environment variables.

### Image Proxy

Images from TMDB are proxied through `https://images.weserv.nl/?url=` by default to improve privacy and caching. Configure via `NEXT_PUBLIC_IMAGE_PROXY`. AniList images bypass the proxy.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is for educational purposes only. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie/TV metadata
- [AniList](https://anilist.co/) for anime data and character search
- [Vidstack](https://www.vidstack.io/) for the video player
- [Supabase](https://supabase.com/) for authentication and database
- [Vercel](https://vercel.com/) for hosting and analytics
- All the third-party embed providers for streaming infrastructure
