import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'

// DELETE /api/user/delete - Permanently delete the user's account and all data
export async function DELETE(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Destructive and irreversible — very low limit.
    const limited = rateLimit(request, { limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: 'user-delete' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { error: 'Account deletion is not configured. Please try again later.' },
        { status: 500 }
      )
    }

    // Accounts created with email/password must have their password re-entered
    // before deletion (defense against a hijacked session). OAuth-only accounts
    // (e.g. Google) have no password, so their verified session is sufficient.
    const hasPassword = (user.identities ?? []).some((i) => i.provider === 'email')

    if (hasPassword) {
      const body = await request.json().catch(() => ({}))
      const { password } = body

      if (!password || typeof password !== 'string') {
        return NextResponse.json(
          { error: 'Password is required to delete your account.' },
          { status: 400 }
        )
      }

      // Verify the password against Supabase auth with a fresh anonymous client.
      // The cookie/session client is deliberately not used here so verifying the
      // password never touches or refreshes the user's existing session.
      const verifyClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { error: signInError } = await verifyClient.auth.signInWithPassword({
        email: user.email ?? '',
        password,
      })

      if (signInError) {
        return NextResponse.json(
          { error: 'Incorrect password. Please try again.' },
          { status: 401 }
        )
      }
    }

    // Admin client using the service role key — required to delete users from
    // auth.users. The anon key used elsewhere cannot do this.
    //
    // All of the user's data (profiles, watch_later, continue_watching) is
    // removed automatically because every table references
    // auth.users(id) ON DELETE CASCADE.
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await admin.auth.admin.deleteUser(user.id)

    if (error) {
      console.error('Account deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
