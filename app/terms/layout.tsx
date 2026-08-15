import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Movime',
  description: 'The terms and conditions for using Movime.',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
