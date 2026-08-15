import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Watchlist - Movime',
  description: 'Your saved movies and TV shows on Movime.',
  robots: { index: false, follow: false },
}

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
