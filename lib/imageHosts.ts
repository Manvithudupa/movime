// Trusted image-host allowlist and URL validation.
//
// Kept free of JSX (and of next/image) so it can be unit tested directly and
// reused from server routes as well as components.

export const PROXY_BASE =
  process.env.NEXT_PUBLIC_IMAGE_PROXY || 'https://images.weserv.nl/?url='

// Domains that should NOT be proxied
const NO_PROXY_DOMAINS = ['anilist.co']

// SECURITY: only these image hosts are ever rendered. Everything else is
// replaced with a transparent pixel. This closes the open-proxy hole where a
// user-controlled URL (avatar_url, localStorage poster_path) was wrapped in
// the configured image proxy (images.weserv.nl or a custom
// NEXT_PUBLIC_IMAGE_PROXY) and fetched from any host — a relay/SSRF vector when
// a self-hosted proxy is configured. It also stops arbitrary external hosts
// from loading tracking pixels in the user's browser. Mirror the hosts in
// next.config.js images.remotePatterns plus the AniList CDN used for character
// avatars.
const ALLOWED_IMAGE_HOSTS: string[] = [
  'image.tmdb.org',
  'anilist.co',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'upload.wikimedia.org',
  'raw.githubusercontent.com',
]

// Transparent 1x1 GIF used in place of any blocked/untrusted image URL.
export const BLOCKED_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function isAllowedImageHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false
  return ALLOWED_IMAGE_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  )
}

export function isAllowedImageSrc(src: string): boolean {
  if (!src) return true
  // Same-origin paths only. A protocol-relative URL ("//host/x.png") also
  // starts with "/" but resolves to an external host, so it must go through
  // the allowlist below rather than being trusted as a local path.
  if (src.startsWith('/') && !src.startsWith('//')) return true
  try {
    return isAllowedImageHost(new URL(src).hostname)
  } catch {
    return false
  }
}

export function shouldSkipProxy(src: string): boolean {
  return NO_PROXY_DOMAINS.some((domain) => src.includes(domain))
}
