import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  let next = searchParams.get('next') ?? '/'

  // Only allow same-site relative redirects to prevent open-redirect abuse
  // (e.g. next="//evil.com" or next="/\\evil.com").
  next = next.replace(/\\/g, '/')
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If this is a password recovery flow, redirect to the reset-password page
      // with a verification flag that the reset page validates
      if (type === 'recovery' || next === '/auth/reset-password') {
        return NextResponse.redirect(`${origin}/auth/reset-password?recovery=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
