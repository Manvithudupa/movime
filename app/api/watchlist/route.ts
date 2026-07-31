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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }

    const body = await request.json()
    const { content_id, content_type, title, poster_path, status } = body

    if (!content_id || !content_type || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { has_id: !!content_id, has_type: !!content_type, has_title: !!title }
      }, { status: 400 })
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

      if (error) {
        console.error('Watchlist update error:', error)
        return NextResponse.json({ error: `Failed to update status: ${error.message}` }, { status: 500 })
      }

      return NextResponse.json({ 
        added: true, 
        item: updated, 
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
      return NextResponse.json({ error: 'Item not found in watchlist' }, { status: 404 })
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
