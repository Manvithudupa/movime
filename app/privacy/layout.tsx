import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Movime',
  description: 'How Movime collects, uses, and protects your data.',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
