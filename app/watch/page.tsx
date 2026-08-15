import type { Metadata } from 'next'
import WatchPageContent from './WatchPageContent'
import { getContentMetadata } from '@/lib/contentMeta'

type Props = {
  searchParams: Promise<{ id?: string; type?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { id, type } = await searchParams
  return getContentMetadata(id, type ?? null, 'watch')
}

export default function WatchPage() {
  return <WatchPageContent />
}
