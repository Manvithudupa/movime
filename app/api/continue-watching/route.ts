import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'
import { parseContentId } from '@/lib/validation'

// GET /api/continue-watching - Fetch user's continue watching items
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimitGlobal(request, { limit: 120, windowMs: 60 * 1000, keyPrefix: 'continue-watching' })
    if (!limited.success) return rateLimitResponse(limited)

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
      return NextResponse.json({ error: `Failed to fetch continue watching` }, { status: 500 })
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
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Progress saves happen every ~15s while watching — allow a comfortable margin.
    const limited = await rateLimitGlobal(request, { limit: 60, windowMs: 60 * 1000, keyPrefix: 'continue-watching' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
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

    const numericContentId = parseContentId(content_id)

    if (numericContentId === null) {
      return NextResponse.json({ error: 'Invalid content_id' }, { status: 400 })
    }

    // Validate every user-supplied field so junk values never reach the DB.
    const isNonNegativeNumber = (v: unknown): v is number =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0
    const isOptionalString = (v: unknown, max: number): boolean =>
      v == null || (typeof v === 'string' && v.length <= max)

    if (content_type !== 'movie' && content_type !== 'tv') {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }
    if (typeof title !== 'string' || !title.trim() || title.length > 500) {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    }
    if (!isOptionalString(poster_path, 1000) || !isOptionalString(backdrop_path, 1000) || !isOptionalString(episode_title, 500)) {
      return NextResponse.json({ error: 'Invalid text field' }, { status: 400 })
    }
    if (progress_seconds != null && !isNonNegativeNumber(progress_seconds)) {
      return NextResponse.json({ error: 'Invalid progress_seconds' }, { status: 400 })
    }
    if (duration_seconds != null && !isNonNegativeNumber(duration_seconds)) {
      return NextResponse.json({ error: 'Invalid duration_seconds' }, { status: 400 })
    }
    if (is_completed != null && typeof is_completed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_completed' }, { status: 400 })
    }
    if (season_number != null && !(Number.isInteger(season_number) && season_number >= 1)) {
      return NextResponse.json({ error: 'Invalid season_number' }, { status: 400 })
    }
    if (episode_number != null && !(Number.isInteger(episode_number) && episode_number >= 1)) {
      return NextResponse.json({ error: 'Invalid episode_number' }, { status: 400 })
    }

    // Both fields are optional, so default them before dividing — otherwise a
    // missing progress_seconds produced NaN, which was then persisted as
    // progress_percentage and poisoned every reader that expects a number.
    const safeProgress = typeof progress_seconds === 'number' ? progress_seconds : 0
    const safeDuration = typeof duration_seconds === 'number' ? duration_seconds : 0
    const progressPercent = safeDuration > 0
      ? Math.min(Math.max(Math.round((safeProgress / safeDuration) * 100), 0), 100)
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
      return NextResponse.json({ error: `Failed to save progress` }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      item: result 
    })
  } catch (error) {
    console.error('Continue watching error:', error)
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/continue-watching - Remove a continue watching entry
export async function DELETE(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limited = await rateLimitGlobal(request, { limit: 30, windowMs: 60 * 1000, keyPrefix: 'continue-watching' })
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

    // POST validates these; DELETE used to pass them straight into the query,
    // so a garbage id/type silently matched 0 rows and reported success.
    if (contentType !== 'movie' && contentType !== 'tv') {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }

    const numericContentId = parseContentId(contentId)

    if (numericContentId === null) {
      return NextResponse.json({ error: 'Invalid content_id' }, { status: 400 })
    }

    const numericSeason = seasonNumber != null ? parseInt(seasonNumber, 10) : undefined
    const numericEpisode = episodeNumber != null ? parseInt(episodeNumber, 10) : undefined

    if (
      (numericSeason !== undefined && (!Number.isInteger(numericSeason) || numericSeason < 0)) ||
      (numericEpisode !== undefined && (!Number.isInteger(numericEpisode) || numericEpisode < 0))
    ) {
      return NextResponse.json({ error: 'Invalid season_number or episode_number' }, { status: 400 })
    }

    let query = supabase
      .from('continue_watching')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', numericContentId)
      .eq('content_type', contentType)

    if (numericSeason !== undefined) {
      query = query.eq('season_number', numericSeason)
    }
    if (numericEpisode !== undefined) {
      query = query.eq('episode_number', numericEpisode)
    }

    const { error } = await query

    if (error) {
      console.error('Continue watching remove error:', error)
      return NextResponse.json({ error: `Failed to remove` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Continue watching error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
