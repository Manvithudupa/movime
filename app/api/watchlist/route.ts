import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'

const VALID_STATUSES = ['completed', 'watching', 'plan_to_watch', 'dropped'] as const
type WatchStatus = typeof VALID_STATUSES[number]

// Older deployments of schema.sql shipped without an UPDATE policy on
// watch_later, which makes RLS silently block UPDATE statements (they match
// 0 rows) and causes status changes to report "Item not found". This helper
// rebuilds an existing row via DELETE + INSERT — both of which have RLS
// policies — as a fallback, so status updates keep working until the UPDATE
// policy is added to the database.
async function rebuildWatchlistItem(
  supabase: any,
  existing: any,
  overrides: { status: string; title?: string; poster_path?: string | null }
) {
  const { error: deleteError } = await supabase
    .from('watch_later')
    .delete()
    .eq('id', existing.id)

  if (deleteError) return { data: null, error: deleteError }

  const { data, error } = await supabase
    .from('watch_later')
    .insert({
      user_id: existing.user_id,
      content_id: existing.content_id,
      content_type: existing.content_type,
      title: overrides.title !== undefined ? overrides.title : existing.title,
      poster_path: overrides.poster_path !== undefined ? overrides.poster_path : existing.poster_path,
      status: overrides.status,
      added_at: existing.added_at,
    })
    .select()
    .single()

  return { data, error }
}

const MAX_TITLE = 500
const MAX_POSTER = 1000

// GET /api/watchlist - Fetch user's watchlist
export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit(request, { limit: 120, windowMs: 60 * 1000, keyPrefix: 'watchlist' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('watch_later')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Watchlist fetch error:', error)
      return NextResponse.json({ error: `Failed to fetch watchlist: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Watchlist fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/watchlist - Add item to watchlist (or toggle if exists)
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limited = rateLimit(request, { limit: 30, windowMs: 60 * 1000, keyPrefix: 'watchlist' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { content_id, content_type, title, poster_path, status } = body

    if (!content_id || !content_type || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { has_id: !!content_id, has_type: !!content_type, has_title: !!title }
      }, { status: 400 })
    }

    // Validate types and sizes so junk can't be written into the database.
    if (content_type !== 'movie' && content_type !== 'tv') {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }
    if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE) {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    }
    if (poster_path != null && (typeof poster_path !== 'string' || poster_path.length > MAX_POSTER)) {
      return NextResponse.json({ error: 'Invalid poster_path' }, { status: 400 })
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
    }

    const finalStatus: WatchStatus = status || 'plan_to_watch'
    
    // Ensure content_id is a number for the integer column
    const numericContentId = typeof content_id === 'string' ? parseInt(content_id, 10) : content_id
    
    if (isNaN(numericContentId)) {
      return NextResponse.json({ error: 'Invalid content_id' }, { status: 400 })
    }

    // Check if already in watchlist
    const { data: existing, error: checkError } = await supabase
      .from('watch_later')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_id', numericContentId)
      .eq('content_type', content_type)
      .maybeSingle()

    if (checkError) {
      console.error('Watchlist check error:', checkError)
      return NextResponse.json({ error: `Database error: ${checkError.message}` }, { status: 500 })
    }

    if (existing) {
      // If same status or no status change, toggle removal
      if (!status || existing.status === status) {
        const { error } = await supabase
          .from('watch_later')
          .delete()
          .eq('id', existing.id)

        if (error) {
          console.error('Watchlist remove error:', error)
          return NextResponse.json({ error: `Failed to remove: ${error.message}` }, { status: 500 })
        }

        return NextResponse.json({ 
          added: false, 
          message: 'Removed from watchlist',
          itemId: numericContentId
        })
      }

      // Update status
      const { data: updated, error } = await supabase
        .from('watch_later')
        .update({ 
          status: finalStatus, 
          title, // keep title updated
          poster_path, // keep poster updated
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id)
        .select()
        .single()

      // If the UPDATE was blocked (databases created before the watch_later
      // RLS UPDATE policy was added), the UPDATE silently affects 0 rows and
      // .single() reports PGRST116. Rebuild the row via DELETE + INSERT so
      // the status change still works; any other error is returned as-is.
      let item = updated
      if (error) {
        if (error.code === 'PGRST116') {
          console.error('Watchlist update blocked, rebuilding row:', error)
          const rebuilt = await rebuildWatchlistItem(supabase, existing, {
            status: finalStatus,
            title,
            poster_path,
          })
          if (rebuilt.error) {
            console.error('Watchlist update error:', error)
            return NextResponse.json({ error: `Failed to update status: ${error.message}` }, { status: 500 })
          }
          item = rebuilt.data
        } else {
          console.error('Watchlist update error:', error)
          return NextResponse.json({ error: `Failed to update status: ${error.message}` }, { status: 500 })
        }
      }

      return NextResponse.json({ 
        added: true, 
        item, 
        statusChanged: true, 
        message: `Status updated to ${finalStatus}` 
      })
    }

    // Add to watchlist
    const { data, error } = await supabase
      .from('watch_later')
      .insert({
        user_id: user.id,
        content_id: numericContentId,
        content_type,
        title,
        poster_path,
        status: finalStatus,
      })
      .select()
      .single()

    if (error) {
      console.error('Watchlist add error:', error)
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Item already in watchlist' }, { status: 409 })
      }
      return NextResponse.json({ error: `Failed to add: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ 
      added: true, 
      item: data, 
      message: `Added as ${finalStatus}` 
    })
  } catch (error) {
    console.error('Watchlist error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// PATCH /api/watchlist - Update item status
export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limited = rateLimit(request, { limit: 30, windowMs: 60 * 1000, keyPrefix: 'watchlist' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { content_id, content_type, status } = body

    if (!content_id || !content_type || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (content_type !== 'movie' && content_type !== 'tv') {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
    }

    const numericContentId = typeof content_id === 'string' ? parseInt(content_id, 10) : content_id

    const { data: updated, error } = await supabase
      .from('watch_later')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('content_id', numericContentId)
      .eq('content_type', content_type)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Watchlist status update error:', error)
      return NextResponse.json({ error: `Failed to update status: ${error.message}` }, { status: 500 })
    }

    if (!updated) {
      // An UPDATE can silently match 0 rows when the database is missing the
      // RLS UPDATE policy for watch_later. Verify the item actually exists
      // before reporting "not found", and rebuild it if it does.
      const { data: existing, error: checkError } = await supabase
        .from('watch_later')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_id', numericContentId)
        .eq('content_type', content_type)
        .maybeSingle()

      if (checkError) {
        console.error('Watchlist status check error:', checkError)
        return NextResponse.json({ error: `Failed to update status: ${checkError.message}` }, { status: 500 })
      }

      if (!existing) {
        return NextResponse.json({ error: 'Item not found in watchlist' }, { status: 404 })
      }

      const rebuilt = await rebuildWatchlistItem(supabase, existing, { status })
      if (rebuilt.error) {
        console.error('Watchlist status rebuild error:', rebuilt.error)
        return NextResponse.json({ error: `Failed to update status: ${rebuilt.error.message}` }, { status: 500 })
      }

      return NextResponse.json({ item: rebuilt.data, message: `Status updated to ${status}` })
    }

    return NextResponse.json({ item: updated, message: `Status updated to ${status}` })
  } catch (error) {
    console.error('Watchlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/watchlist - Remove item from watchlist
export async function DELETE(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limited = rateLimit(request, { limit: 30, windowMs: 60 * 1000, keyPrefix: 'watchlist' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('content_id')
    const contentType = searchParams.get('content_type')

    if (!contentId || !contentType) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
    }

    const numericContentId = parseInt(contentId, 10)

    const { error } = await supabase
      .from('watch_later')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', numericContentId)
      .eq('content_type', contentType)

    if (error) {
      console.error('Watchlist remove error:', error)
      return NextResponse.json({ error: `Failed to remove: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watchlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
