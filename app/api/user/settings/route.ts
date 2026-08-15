import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'

// Only these keys are allowed into the settings JSONB column.
const VALID_KEYS = ['preferredSource', 'defaultQuality', 'autoPlay'] as const

// GET /api/user/settings - Fetch the signed-in user's playback settings
export async function GET() {
  try {
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
    const limited = rateLimit(request, { limit: 20, windowMs: 60 * 1000, keyPrefix: 'user-settings' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const settings = body?.settings

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })
    }

    // Only persist known keys so a client can't stuff arbitrary JSON into the profile.
    const clean: Record<string, unknown> = {}
    for (const key of VALID_KEYS) {
      if (key in settings) clean[key] = settings[key]
    }

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
