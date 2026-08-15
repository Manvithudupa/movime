import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Anime - Movime',
  description: 'Browse top Japanese animation series and movies, with accurate season and episode mapping.',
  openGraph: {
    title: 'Anime - Movime',
    description: 'Browse top Japanese animation series and movies, with accurate season and episode mapping.',
  },
}

export default function AnimeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
