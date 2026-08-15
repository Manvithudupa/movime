import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account - Movime',
  description: 'Sign in or create a Movime account to sync your watchlist across devices.',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
