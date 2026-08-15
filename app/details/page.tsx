import type { Metadata } from 'next'
import DetailsPageContent from './DetailsPageContent'
import { getContentMetadata } from '@/lib/contentMeta'

type Props = {
  searchParams: Promise<{ id?: string; type?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { id, type } = await searchParams
  return getContentMetadata(id, type ?? null, 'details')
}

export default function DetailsPage() {
  return <DetailsPageContent />
}
