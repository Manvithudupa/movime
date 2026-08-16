import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - Movime',
  description:
    'Learn about Movime — a free streaming platform that aggregates movies, TV shows, and anime into one seamless experience.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
