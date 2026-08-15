import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Movies - Movime',
  description: 'Browse the latest and most popular movies, ready to stream free on Movime.',
  openGraph: {
    title: 'Movies - Movime',
    description: 'Browse the latest and most popular movies, ready to stream free on Movime.',
  },
}

export default function MoviesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
