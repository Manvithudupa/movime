import React from 'react'
import Image, { ImageProps } from 'next/image'

const PROXY_BASE = process.env.NEXT_PUBLIC_IMAGE_PROXY || 'https://images.weserv.nl/?url='

function proxiedSrc(src: string | StaticImageData): string | StaticImageData {
  if (typeof src !== 'string') return src
  if (!src.startsWith('http') && !src.startsWith('//')) return src
  if (src.startsWith(PROXY_BASE)) return src
  return `${PROXY_BASE}${encodeURIComponent(src)}`
}

export default function ProxyImage(props: ImageProps) {
  const { src, ...rest } = props
  return <Image src={proxiedSrc(src as any)} {...(rest as any)} />
}
