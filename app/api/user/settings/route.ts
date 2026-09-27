import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'
import { pickValidSettings } from '@/lib/validation'

// GET /api/user/settings - Fetch the signed-in user's playback settings
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimitGlobal(request, { limit: 120, windowMs: 60 * 1000, keyPrefix: 'user-settings' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Settings fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: data?.settings || null })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/user/settings - Save playback settings (merged with existing values)
export async function PUT(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limited = await rateLimitGlobal(request, { limit: 20, windowMs: 60 * 1000, keyPrefix: 'user-settings' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const settings = body?.settings

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })
    }

    // Validate and pick only the known keys/values so a client can't stuff
    // arbitrary JSON (or megabytes of junk) into the profile's settings column.
    const picked = pickValidSettings(settings as Record<string, unknown>)
    if (!picked.ok) {
      return NextResponse.json({ error: `Invalid value for ${picked.invalidKey}` }, { status: 400 })
    }
    const clean = picked.value

    // Merge with existing settings so a partial save never wipes other prefs.
    const { data: existing } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle()

    const merged = { ...(existing?.settings || {}), ...clean }

    const { data, error } = await supabase
      .from('profiles')
      .update({ settings: merged, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('settings')
      .single()

    if (error) {
      console.error('Settings save error:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: data?.settings || merged })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
