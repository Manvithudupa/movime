# Movime 🎬

**Click, watch, enjoy.** Movime is a free streaming platform that aggregates movies, TV shows, and anime from multiple third-party sources into one seamless interface. Built with Next.js 15, TypeScript, and Tailwind CSS.

> **Disclaimer:** Movime does not host or store any media files. All content is sourced from third-party providers and is intended for educational and informational use only.

---

## ✨ Features

- **🎥 Multi-Source Streaming** — Watch content from 21 embed providers with automatic fallback
- **📺 TV Shows & Seasons** — Browse episodes with season selectors and episode detail cards
- **🐱 Anime Integration** — Dedicated anime section with AniList+TMDB cross-referencing for accurate season/episode mapping
- **🔍 Smart Search** — Full-text search with relevance scoring, year filtering, and adult content filtering
- **🔖 Watch Later** — Save content to a personal watch list (persisted in localStorage)
- **👤 User Accounts** — Clerk-powered authentication with profile management (avatar, bio, location)
- **🌈 Anime Title Preferences** — Switch between romaji, english, or native title display
- **📱 Progressive Web App** — Installable on mobile and desktop with offline service worker
- **⚡ Video Progress** — Auto-resume playback from where you left off
- **🎞️ Vidstack Player** — High-quality HLS video player with subtitle support and skip intro/outro
- **🔄 Source Fallback** — Automatic source switching if a provider fails
- **🔞 Content Filtering** — Adult content and blocked content filtering for a safe experience
- **📈 Trending & Categories** — Hollywood, Bollywood, Netflix Originals, Amazon Prime sections

---

## 🖥️ Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage with 7 content sections (Trending Movies, TV Shows, Hollywood, Bollywood, Anime, Netflix, Amazon Prime) and hero carousel |
| `/details?id=&type=` | Content detail page with poster, info, season/episode browser, recommendations |
| `/watch?id=&type=` | Watch page with iframe-based video player and source selector sidebar |
| `/search` | Dedicated search page with sorting (relevance, popularity, rating, year, title) |
| `/settings` | User preferences (preferred source, default quality, auto-play) |
| `/profile` | User profile management (requires authentication) |
| `/contact` | Contact form and support information |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/about` | About Movime |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/profile` | GET/PUT | Fetch or update user profile |
| `/api/user/avatar` | GET | Get user avatar |
| `/api/user/upload-avatar` | POST/DELETE | Upload or remove avatar |
| `/api/webhooks/clerk` | POST | Clerk webhook for user CRUD sync to database |

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router, server actions, and RSC |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling with custom animations |
| **Prisma** | PostgreSQL ORM for user data |
| **Clerk** | Authentication (multi-provider, webhook sync) |
| **Vidstack** | HLS video player with subtitles, chapters, seek controls |
| **Zustand** | Lightweight state management (title preferences, now-playing info) |
| **Framer Motion** | Page transitions, card hover animations, hero carousel |
| **TMDB API** | Movie/TV show metadata, images, recommendations |
| **AniList API** | Anime season breakdown, episode mapping |
| **sonner** | Toast notifications |
| **next-pwa** | Progressive Web App support |
| **Vercel Analytics** | Usage analytics and speed insights |
| **Svix** | Clerk webhook signature verification |

### Streaming Providers (iframe embed)

The platform aggregates from **21 tested embed providers** including VidLink, AutoEmbed, VidSrcSU, VidSrcSBS, VidSrcRIP, VidSrcPM, VidSrcME, VidSrcNL, VidSrcDEV, Flicky, VidStreaming, VidStreamPro, 2Embed, 123Embed, VidEasy, VidFast, CinemaOS, VidNest, MappleTV, RiveStream, and VidZee.

### Anime Streaming (server actions)

Anime episodes are fetched via server actions using **FlixHQ**, **HiAnime**, **AnimePahe**, and **MegaPlay** APIs — proxied through a configurable CORS proxy to avoid browser restrictions.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/bun
- PostgreSQL database (for user features)
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
# TMDB API (required for content discovery)
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key

# Clerk (required for authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Database (required for user profiles)
DATABASE_URL=postgresql://user:pass@localhost:5432/movime

# Anime streaming APIs (optional - for anime playback)
FLIXHQ_API_URL=https://your-flixhq-proxy.com
ANIMEPAHE_API_URL=https://your-animepahe-proxy.com
NEXT_PUBLIC_PROXY_URI=https://cors-proxy.your-domain.com/

# Image proxy (optional - for privacy/caching)
NEXT_PUBLIC_IMAGE_PROXY=https://images.weserv.nl/?url=
```

### Development

```bash
# Start dev server
npm run dev

# Generate Prisma client
npx prisma generate

# Push schema to database
npm run db:push
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
│   │   ├── user/       # User profile & avatar API routes
│   │   └── webhooks/   # Clerk webhook handler
│   ├── contact/        # Contact page
│   ├── details/        # Content detail page
│   ├── privacy/        # Privacy policy
│   ├── profile/        # User profile page
│   ├── search/         # Search page
│   ├── settings/       # User settings page
│   ├── terms/          # Terms of service
│   ├── watch/          # Watch/player page
│   ├── layout.tsx      # Root layout (Clerk, fonts, PWA)
│   ├── page.tsx        # Homepage
│   └── globals.css     # Global styles & animations
├── components/
│   ├── AnimeHero.tsx            # Anime carousel hero
│   ├── AuthProvider.tsx         # Clerk provider wrapper
│   ├── Avatar.tsx               # User avatar component
│   ├── ContentSection.tsx       # Horizontal scrollable content row
│   ├── Footer.tsx               # App footer
│   ├── HeroSection.tsx          # Hero carousel (featured movies)
│   ├── LoadingBar.tsx           # Route loading indicator
│   ├── Navbar.tsx               # Navigation bar (Clerk user menu)
│   ├── PlayerComponent.js       # Video player orchestrator
│   ├── PlayerEpisodeList.js     # Episode list for FlixHQ
│   ├── ProfilePictureUpload.tsx # Avatar upload UI
│   ├── ProxyImage.tsx           # Image proxy wrapper
│   ├── SkeletonCard.tsx         # Loading skeletons
│   ├── Toaster.tsx              # Toast notifications
│   └── VidstackPlayer/          # Vidstack HLS player
├── lib/
│   ├── animeMapper.ts   # AniList + TMDB anime mapping
│   ├── prisma.ts        # Prisma client singleton
│   ├── sources.ts       # Available streaming sources
│   ├── store.ts         # Zustand stores
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # API functions, cache, filtering
├── prisma/
│   └── schema.prisma    # Database schema
├── public/              # Static assets, PWA manifest
├── scripts/             # Build scripts (icon generation)
├── styles/              # Vidstack custom styles
├── utils/
│   ├── logger.ts        # Development logger
│   └── VideoProgressSave.js  # Watch progress persistence
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
3. Click **Watch** or go directly via `/watch?id=123&type=movie`
4. If a source fails, the fallback system automatically tries the next one
5. Manually switch sources from the source sidebar on the watch page

### Search Tips

- Type any movie/TV show/anime name
- Search results are relevance-sorted with substring matching
- Use the sort menu to sort by popularity, rating, year, or title
- Content is filtered for appropriate audiences by default

### Anime Viewing

- Navigate to the **Anime** section
- Click any anime to see details with season/episode breakdown
- Episodes use server actions to fetch from FlixHQ/HiAnime/AnimePahe/MegaPlay
- Toggle between sub/dub on supported providers

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
- [AniList](https://anilist.co/) for anime data
- [Vidstack](https://www.vidstack.io/) for the video player
- [Clerk](https://clerk.com/) for authentication
- All the third-party embed providers for streaming infrastructure
