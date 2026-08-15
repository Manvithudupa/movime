import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search - Movime',
  description: 'Search movies, TV shows, and anime on Movime.',
  robots: { index: false, follow: true },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
