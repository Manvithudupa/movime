import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TV Shows - Movime',
  description: 'Browse binge-worthy TV shows and series, ready to stream free on Movime.',
  openGraph: {
    title: 'TV Shows - Movime',
    description: 'Browse binge-worthy TV shows and series, ready to stream free on Movime.',
  },
}

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
