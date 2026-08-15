import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact - Movime',
  description: 'Get in touch with the Movime team — feedback, bug reports, and feature requests are welcome.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
