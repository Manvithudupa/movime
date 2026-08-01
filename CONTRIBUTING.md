# Contributing to Movime 🎬

First off, thank you for taking the time to contribute! Movime is an educational streaming platform that aggregates movies, TV shows, and anime from multiple third-party sources into one seamless interface. Every contribution makes it better.

This document covers everything you need to know about contributing — from setting up your environment to getting your changes merged.

---

## Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How to Contribute](#-how-to-contribute)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Code Style](#-code-style)
- [Testing & Validation](#-testing--validation)
- [Commit Conventions](#-commit-conventions)
- [Pull Request Process](#-pull-request-process)
- [License](#-license)

---

## 🤝 Code of Conduct

Be kind and respectful. Harassment, discrimination, and abusive behavior of any kind are not tolerated. We're all here to learn and build something fun — keep the conversation constructive and helpful.

---

## 💡 How to Contribute

The Movime repository is currently **private**, so external users can't open issues or pull requests directly on GitHub. That doesn't mean you can't help — here's how:

| I want to... | Do this |
|--------------|---------|
| Report a bug | Use the contact form on the site at `/contact`, or email the developer directly. Include the page, what you did, and what went wrong. |
| Request a feature | Send your idea through the contact form or reach out to the developer on [GitHub](https://github.com/Manvith911). Be specific about what you want and why. |
| Report a broken source | Note the content title and which source failed (the source name is shown in the sidebar on the watch page). |
| Contribute code | If you're a collaborator, follow the workflow below. If you're external and have a patch, reach out via the contact form and the developer can guide you. |

> **Note:** Movime does not host any media files. Bug reports about missing/removed content should be directed to the third-party providers themselves.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/bun
- A Supabase project (for authentication, watchlist, and continue watching)
- A TMDB API key ([free](https://www.themoviedb.org/settings/api))
- A Resend API key for the contact form ([free](https://resend.com/api-keys))

### Setting Up Locally

```bash
# Clone the repository
git clone https://github.com/Manvith911/movime.git
cd movime

# Install dependencies
npm install
# or
bun install

# Configure environment variables
cp .env.example .env.local
# then fill in your values (Supabase, TMDB, Resend)
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `lib/supabase/schema.sql` (profiles, watch_later) in the SQL Editor
3. Run `lib/supabase/continue_watching.sql` for the continue-watching table
4. Enable email/password auth in Authentication → Providers
5. Copy your project URL and anon key into `.env.local`

### Running the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the site should load with real content from TMDB.

---

## 🔧 Development Workflow

1. **Create a branch** for your work:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes.** Keep them small and focused — a single feature or fix per branch is much easier to review.

3. **Follow the project structure:**

   - **Pages** live in `app/` (one folder per route)
   - **Reusable UI** lives in `components/`
   - **Data fetching, caching, and helpers** live in `lib/` (`utils.ts`, `store.ts`, `sources.ts`)
   - **API routes** live in `app/api/<name>/route.ts`

4. **Reuse what already exists.** If there's a helper, component, or store for something, use it instead of reimplementing it.

5. **Run validation** (see below) before committing.

---

## 🎨 Code Style

- **TypeScript** — the project uses strict type checking. Avoid `any` where practical; add types to new functions and components.
- **Components** — client components use `'use client'` at the top. Follow the naming style of existing components (PascalCase files).
- **Styling** — use Tailwind utility classes. Reuse existing class patterns (e.g. `bg-white/10`, `border-white/10`, `rounded-lg`) for visual consistency.
- **Imports** — use the `@/` path alias (e.g. `@/lib/utils`, `@/components/Navbar`).
- **No dead code** — remove unused imports, variables, and branches before submitting.
- **Keep changes minimal** — prefer the smallest change that solves the problem.

---

## ✅ Testing & Validation

Before you push or open a pull request, run all of these:

```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

All three should pass cleanly. The build also runs `scripts/generate-icons.js`, so make sure icon generation succeeds too.

For UI changes, verify in the browser:

- The page renders without console errors
- Navigation works on **mobile and desktop** (the site has separate layouts)
- Interactions (watchlist toggles, search, season/episode selectors) behave correctly
- Content loads from TMDB (posters, overviews, recommendations)

---

## 📝 Commit Conventions

Use clear, descriptive commit messages. A simple format works well:

```
Add continue-watching progress tracking
Fix hero status badge for synced watchlist items
Remove dead movies/tv/anime view branches
```

Prefix with the type of change when it helps (`fix:`, `feat:`, `refactor:`, `docs:`).

---

## 🔀 Pull Request Process

For collaborators:

1. Ensure your branch is up to date with `main`
2. Run `npx tsc --noEmit`, `npm run lint`, and `npm run build` — all must pass
3. Open a pull request with a clear title and description of what changed and why
4. Reference any related context (e.g. a feature request submitted via the contact form)
5. Wait for review — address feedback and keep the branch rebased on `main`

For external contributors: reach out via the contact form on the site at `/contact`, or GitHub, and the developer will work with you to get your contribution in.

---

## 📄 License

Movime is an educational project. By contributing, you agree that your contributions are licensed under the project's [license](LICENSE) (GNU GPL v3, educational use).

---

Thanks again for helping make Movime better! 🎬
