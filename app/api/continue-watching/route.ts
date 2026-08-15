import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'

// GET /api/continue-watching - Fetch user's continue watching items
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('continue_watching')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Continue watching fetch error:', error)
      return NextResponse.json({ error: `Failed to fetch continue watching: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Continue watching fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/continue-watching - Upsert a continue watching entry
export async function POST(request: NextRequest) {
  try {
    // Progress saves happen every ~15s while watching — allow a comfortable margin.
    const limited = rateLimit(request, { limit: 60, windowMs: 60 * 1000, keyPrefix: 'continue-watching' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      content_id, 
      content_type, 
      title, 
      poster_path,
      backdrop_path,
      season_number,
      episode_number,
      episode_title,
      progress_seconds,
      duration_seconds,
      is_completed 
    } = body

    if (!content_id || !content_type || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { has_id: !!content_id, has_type: !!content_type, has_title: !!title }
      }, { status: 400 })
    }

    const numericContentId = typeof content_id === 'string' ? parseInt(content_id, 10) : content_id
    
    if (isNaN(numericContentId)) {
      return NextResponse.json({ error: 'Invalid content_id' }, { status: 400 })
    }

    const progressPercent = duration_seconds > 0 
      ? Math.min(Math.round((progress_seconds / duration_seconds) * 100), 100) 
      : 0

    // Try to find existing record first (manual upsert pattern).
    // There is ONE continue-watching entry per show/movie, so match on
    // (user_id, content_id, content_type) only — NOT season/episode. When the
    // user starts a different episode of the same series, the existing row is
    // updated with the new season/episode instead of creating a new entry.
    // `.order(...).limit(1)` picks the most recent row in case old duplicate
    // rows (one per episode) still exist in the database.
    const { data: existingRows } = await supabase
      .from('continue_watching')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', numericContentId)
      .eq('content_type', content_type)
      .order('updated_at', { ascending: false })
      .limit(1)

    const existing = existingRows?.[0]

    let result;
    let error;

    if (existing) {
      // Best-effort cleanup: remove any other stale rows for the same show/movie
      // (legacy duplicates from the old per-episode behavior) so updating the
      // most recent row can never collide with them.
      await supabase
        .from('continue_watching')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', numericContentId)
        .eq('content_type', content_type)
        .neq('id', existing.id)

      // Update existing record (season/episode included so the entry always
      // reflects the episode currently being watched)
      const { data, error: updateError } = await supabase
        .from('continue_watching')
        .update({
          title,
          poster_path: poster_path || null,
          backdrop_path: backdrop_path || null,
          season_number: content_type === 'tv' ? (season_number || null) : null,
          episode_number: content_type === 'tv' ? (episode_number || null) : null,
          episode_title: content_type === 'tv' ? (episode_title || null) : null,
          progress_seconds: progress_seconds || 0,
          duration_seconds: duration_seconds || 0,
          progress_percentage: is_completed ? 100 : progressPercent,
          is_completed: is_completed || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      result = data
      error = updateError
    } else {
      // Insert new record
      const { data, error: insertError } = await supabase
        .from('continue_watching')
        .insert({
          user_id: user.id,
          content_id: numericContentId,
          content_type,
          title,
          poster_path: poster_path || null,
          backdrop_path: backdrop_path || null,
          season_number: content_type === 'tv' ? (season_number || null) : null,
          episode_number: content_type === 'tv' ? (episode_number || null) : null,
          episode_title: content_type === 'tv' ? (episode_title || null) : null,
          progress_seconds: progress_seconds || 0,
          duration_seconds: duration_seconds || 0,
          progress_percentage: is_completed ? 100 : progressPercent,
          is_completed: is_completed || false,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      result = data
      error = insertError
    }

    if (error) {
      console.error('Continue watching save error:', error)
      return NextResponse.json({ error: `Failed to save progress: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      item: result 
    })
  } catch (error) {
    console.error('Continue watching error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE /api/continue-watching - Remove a continue watching entry
export async function DELETE(request: NextRequest) {
  try {
    const limited = rateLimit(request, { limit: 30, windowMs: 60 * 1000, keyPrefix: 'continue-watching' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('content_id')
    const contentType = searchParams.get('content_type')
    const seasonNumber = searchParams.get('season_number')
    const episodeNumber = searchParams.get('episode_number')

    if (!contentId || !contentType) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
    }

    const numericContentId = parseInt(contentId, 10)
    
    let query = supabase
      .from('continue_watching')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', numericContentId)
      .eq('content_type', contentType)

    if (seasonNumber) {
      query = query.eq('season_number', parseInt(seasonNumber, 10))
    }
    if (episodeNumber) {
      query = query.eq('episode_number', parseInt(episodeNumber, 10))
    }

    const { error } = await query

    if (error) {
      console.error('Continue watching remove error:', error)
      return NextResponse.json({ error: `Failed to remove: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Continue watching error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
