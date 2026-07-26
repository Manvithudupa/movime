import React from 'react'
import Image, { ImageProps, StaticImageData } from 'next/image'

const PROXY_BASE = process.env.NEXT_PUBLIC_IMAGE_PROXY || 'https://images.weserv.nl/?url='

// Domains that should NOT be proxied
const NO_PROXY_DOMAINS = ['anilist.co']

function shouldSkipProxy(src: string): boolean {
  return NO_PROXY_DOMAINS.some(domain => src.includes(domain))
}

function proxiedSrc(src?: string | StaticImageData): string | StaticImageData | undefined {
  if (!src) return src
  if (typeof src !== 'string') return src
  if (!src.startsWith('http') && !src.startsWith('//')) return src
  if (src.startsWith(PROXY_BASE)) return src
  // Skip proxy for specific domains (e.g. AniList images)
  if (shouldSkipProxy(src)) return src
  return `${PROXY_BASE}${encodeURIComponent(src)}`
}

export default function ProxyImage(props: ImageProps) {
  const { src, ...rest } = props
  return <Image src={proxiedSrc(src as any) as any} {...(rest as any)} />
}
