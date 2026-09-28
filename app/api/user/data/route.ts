import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'

// DELETE /api/user/data - Clear the user's watchlist and/or watch history.
//
// The settings page used to clear these by looping the per-item DELETE
// endpoints. Their rate limits (30/min for continue-watching) cut the loop off
// partway through, so the UI reported success while most rows were left behind.
// One request per table also keeps a large library from firing hundreds of
// calls at once.
//
// `?scope=watchlist` (or `history`) narrows the clear — "Clear Watch Later"
// only wants the watchlist. Anything else clears both.
export async function DELETE(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Destructive — low limit, but high enough to retry a failed attempt.
    const limited = await rateLimitGlobal(request, { limit: 10, windowMs: 60 * 60 * 1000, keyPrefix: 'user-data' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')
    const clearWatchlist = scope !== 'history'
    const clearHistory = scope !== 'watchlist'

    if (clearWatchlist) {
      const { error: watchlistError } = await supabase
        .from('watch_later')
        .delete()
        .eq('user_id', user.id)

      if (watchlistError) {
        console.error('Clear watchlist error:', watchlistError)
        return NextResponse.json({ error: 'Failed to clear watchlist' }, { status: 500 })
      }
    }

    if (clearHistory) {
      const { error: historyError } = await supabase
        .from('continue_watching')
        .delete()
        .eq('user_id', user.id)

      if (historyError) {
        console.error('Clear watch history error:', historyError)
        return NextResponse.json({ error: 'Failed to clear watch history' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Clear user data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
