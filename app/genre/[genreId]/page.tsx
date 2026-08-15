import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import GenrePageContent from './GenrePageContent'
import { getGenreMetadata } from '@/lib/contentMeta'

type Props = {
  params: Promise<{ genreId: string }>
  searchParams: Promise<{ type?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { genreId } = await params
  const { type } = await searchParams
  const numericId = parseInt(genreId, 10)
  if (Number.isNaN(numericId)) return { title: 'Genres - Movime' }
  return getGenreMetadata(numericId, type === 'tv' ? 'tv' : 'movie')
}

export default async function GenrePage({ params }: Props) {
  const { genreId } = await params
  const numericId = parseInt(genreId, 10)
  if (Number.isNaN(numericId)) notFound()

  return <GenrePageContent genreId={numericId} />
}
