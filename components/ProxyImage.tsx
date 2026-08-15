import React from 'react'
import Image, { ImageProps, StaticImageData } from 'next/image'

const PROXY_BASE = process.env.NEXT_PUBLIC_IMAGE_PROXY || 'https://images.weserv.nl/?url='

// Domains that should NOT be proxied
const NO_PROXY_DOMAINS = ['anilist.co']

// SECURITY: only these image hosts are ever rendered. Everything else is
// replaced with a transparent pixel. This closes the open-proxy hole where a
// user-controlled URL (avatar_url, localStorage poster_path) was wrapped in
// the configured image proxy (images.weserv.nl or a custom NEXT_PUBLIC_IMAGE_PROXY)
// and fetched from any host — a relay/SSRF vector when a self-hosted proxy is
// configured. It also stops arbitrary external hosts from loading tracking
// pixels in the user's browser. Mirror the hosts in next.config.js
// images.remotePatterns plus the AniList CDN used for character avatars.
const ALLOWED_IMAGE_HOSTS: string[] = [
  'image.tmdb.org',
  'anilist.co',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'upload.wikimedia.org',
  'raw.githubusercontent.com',
]

// Transparent 1x1 GIF used in place of any blocked/untrusted image URL.
const BLOCKED_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function isAllowedImageHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false
  return ALLOWED_IMAGE_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  )
}

export function isAllowedImageSrc(src: string): boolean {
  if (!src || src.startsWith('/')) return true
  try {
    return isAllowedImageHost(new URL(src).hostname)
  } catch {
    return false
  }
}

function shouldSkipProxy(src: string): boolean {
  return NO_PROXY_DOMAINS.some(domain => src.includes(domain))
}

function proxiedSrc(src?: string | StaticImageData): string | StaticImageData | undefined {
  if (!src) return src
  if (typeof src !== 'string') return src
  // Local paths (e.g. "/poster.jpg") are always fine.
  if (src.startsWith('/')) return src

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
    if (inner && isAllowedImageHost(new URL(inner).hostname)) {
      return src // already-proxied URL to a trusted host — pass through
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
