import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse by Genre - Movime',
  description: 'Discover movies and TV shows by genre and stream them free on Movime.',
}

export default function GenresLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
