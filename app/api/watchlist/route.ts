import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['completed', 'watching', 'plan_to_watch', 'dropped'] as const
type WatchStatus = typeof VALID_STATUSES[number]

// GET /api/watchlist - Fetch user's watchlist
export async function GET() {
  try {
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
      return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content_id, content_type, title, poster_path, status } = await request.json()

    if (!content_id || !content_type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const finalStatus: WatchStatus = status || 'plan_to_watch'

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from('watch_later')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .single()

    if (existing) {
      // If same status or no status change, toggle removal
      if (!status || existing.status === status) {
        const { error } = await supabase
          .from('watch_later')
          .delete()
          .eq('id', existing.id)

        if (error) {
          console.error('Watchlist remove error:', error)
          return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
        }

        return NextResponse.json({ added: false, message: 'Removed from watchlist' })
      }

      // Update status
      const { data: updated, error } = await supabase
        .from('watch_later')
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Watchlist update error:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }

      return NextResponse.json({ added: true, item: updated, statusChanged: true, message: `Status updated to ${finalStatus}` })
    }

    // Add to watchlist
    const { data, error } = await supabase
      .from('watch_later')
      .insert({
        user_id: user.id,
        content_id,
        content_type,
        title,
        poster_path,
        status: finalStatus,
      })
      .select()
      .single()

    if (error) {
      console.error('Watchlist add error:', error)
      return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
    }

    return NextResponse.json({ added: true, item: data, message: `Added as ${finalStatus}` })
  } catch (error) {
    console.error('Watchlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/watchlist - Update item status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content_id, content_type, status } = await request.json()

    if (!content_id || !content_type || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('watch_later')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .select()
      .single()

    if (error) {
      console.error('Watchlist status update error:', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
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

    const { error } = await supabase
      .from('watch_later')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', parseInt(contentId))
      .eq('content_type', contentType)

    if (error) {
      console.error('Watchlist remove error:', error)
      return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watchlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
