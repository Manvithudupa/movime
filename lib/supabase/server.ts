import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // SECURITY: mark the session cookie Secure so it is never transmitted
      // over plain HTTP. httpOnly cannot be enabled here — @supabase/ssr's
      // browser client reads the session back from document.cookie, so an
      // httpOnly cookie would break client-side session restore (users would
      // appear signed out on every load). The JS-readable token is mitigated
      // by keeping the site free of XSS sinks and validating all user input.
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
