import type { NextRequest } from 'next/server'

/**
 * CSRF defense-in-depth for state-changing API routes.
 *
 * The Supabase session cookie is SameSite=Lax, which already stops browsers
 * from sending it on cross-site POST/PATCH/PUT/DELETE. This check adds a
 * second layer: if a request carries an Origin or Referer header (browsers
 * always send Origin on fetch POSTs), it must match the request's own Host.
 * Non-browser clients (curl, scripts) send no Origin/Referer and are allowed
 * through — they have no cookies to abuse.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get('host')
  if (!host) return false

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const source = origin || referer

  // No Origin and no Referer — non-browser client, nothing to protect against.
  if (!source) return true

  try {
    return new URL(source).host === host
  } catch {
    return false
  }
}
