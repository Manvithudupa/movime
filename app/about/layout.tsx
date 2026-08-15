import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - Movime',
  description: 'Click, watch, enjoy. Movime is a free streaming platform aggregating movies, TV shows, and anime.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
