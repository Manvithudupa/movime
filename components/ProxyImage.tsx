import React from 'react'
import Image, { ImageProps, StaticImageData } from 'next/image'
import {
  BLOCKED_SRC,
  PROXY_BASE,
  isAllowedImageHost,
  isAllowedImageSrc,
  shouldSkipProxy,
} from '@/lib/imageHosts'

// The allowlist itself lives in lib/imageHosts.ts (JSX-free, unit tested).
// Re-exported here so existing imports from this module keep working.
export { isAllowedImageHost, isAllowedImageSrc }

function proxiedSrc(src?: string | StaticImageData): string | StaticImageData | undefined {
  if (!src) return src
  if (typeof src !== 'string') return src
  // Local paths (e.g. "/poster.jpg") are always fine. Protocol-relative URLs
  // ("//evil.com/x.png") are NOT — they resolve to an external host and would
  // slip past the allowlist below. next.config sets images.unoptimized, so the
  // browser fetches whatever src we hand to <Image>.
  if (src.startsWith('/') && !src.startsWith('//')) return src

  let hostname: string
  let parsed: URL
  try {
    // A relative base makes protocol-relative URLs (//host/...) parse too.
    parsed = new URL(src, 'https://placeholder.invalid')
    hostname = parsed.hostname
  } catch {
    return BLOCKED_SRC
  }

  // The proxy host itself is only trusted when the URL it points at is one of
  // the allowlisted image hosts — otherwise this is how an attacker would smuggle
  // an arbitrary URL through the proxy.
  const proxyHost = PROXY_BASE.startsWith('http')
    ? new URL(PROXY_BASE).hostname
    : ''

  if (hostname === proxyHost && proxyHost) {
    const inner = parsed.searchParams.get('url')
    if (inner) {
      try {
        if (isAllowedImageHost(new URL(inner).hostname)) {
          return src // already-proxied URL to a trusted host — pass through
        }
      } catch {
        // Malformed inner URL — treat it as untrusted rather than throwing.
        // (new URL() throws here, which used to crash the whole render.)
      }
    }
    return BLOCKED_SRC
  }

  if (!isAllowedImageHost(hostname)) {
    return BLOCKED_SRC
  }

  if (src.startsWith(PROXY_BASE)) return src
  if (shouldSkipProxy(src)) return src
  return `${PROXY_BASE}${encodeURIComponent(src)}`
}

export default function ProxyImage({ alt, ...props }: ImageProps) {
  const { src: _src, ...rest } = props
  const src = proxiedSrc(_src as any) as any
  const resolvedAlt = alt || (typeof _src === 'string' ? _src.split('/').pop()?.split('.')[0] || 'Image' : 'Image')
  return <Image src={src} alt={resolvedAlt} {...(rest as any)} />
}
