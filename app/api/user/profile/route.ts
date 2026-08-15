import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'
import { isAllowedImageHost } from '@/components/ProxyImage'

const VALID_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say']
const MAX_LENGTHS = { name: 100, bio: 500, location: 120, website: 300 } as const

const isOptString = (v: unknown, max: number): boolean =>
  v == null || (typeof v === 'string' && v.length <= max)

// Website is a plain link — any http(s) URL is fine, but non-http schemes
// (javascript:, data:, vbscript:) are rejected so a malicious value can't end
// up in an <a href>.
const isValidWebsite = (v: unknown): boolean =>
  v == null ||
  (typeof v === 'string' && v.length <= MAX_LENGTHS.website && /^https?:\/\/\S+$/i.test(v))

// avatar_url is rendered as an image, so it must point at a trusted image
// host (or be a small inline raster image). This closes the open-proxy hole
// where a user-set URL was wrapped in the image proxy and fetched from any
// host.
const isValidAvatarUrl = (v: unknown): boolean => {
  if (v == null) return true
  if (typeof v !== 'string' || v.length > 1000) return false
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)) return v.length <= 500_000
  if (!/^https?:\/\//i.test(v)) return false
  try {
    return isAllowedImageHost(new URL(v).hostname)
  } catch {
    return false
  }
}

// The anime character record is stored as JSON and only its id/name/image are
// ever rendered — enforce that exact shape (including image host allowlist).
const isValidAnimeCharacter = (v: unknown): boolean => {
  if (v == null) return true
  if (typeof v !== 'object' || Array.isArray(v)) return false
  const character = v as Record<string, any>
  if (typeof character.id !== 'number') return false
  if (!character.name || typeof character.name !== 'object' || typeof character.name.full !== 'string') return false
  if (!character.image || typeof character.image !== 'object') return false
  const image = character.image as Record<string, any>
  return isValidAvatarUrl(image.large) && (image.medium == null || isValidAvatarUrl(image.medium))
}

export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimitGlobal(request, { limit: 120, windowMs: 60 * 1000, keyPrefix: 'profile' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limited = await rateLimitGlobal(request, { limit: 20, windowMs: 60 * 1000, keyPrefix: 'profile' })
    if (!limited.success) return rateLimitResponse(limited)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { name, bio, gender, location, website, anime_character, avatar_url } = body

    // Reject invalid input server-side before it ever reaches the database.
    if (
      !isOptString(name, MAX_LENGTHS.name) ||
      !isOptString(bio, MAX_LENGTHS.bio) ||
      !isOptString(location, MAX_LENGTHS.location) ||
      !isValidWebsite(website) ||
      !isValidAvatarUrl(avatar_url) ||
      !isValidAnimeCharacter(anime_character)
    ) {
      return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 })
    }

    if (gender !== undefined && gender !== '' && !VALID_GENDERS.includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    
    if (name !== undefined) updateData.name = name
    if (bio !== undefined) updateData.bio = bio
    // The form's "Prefer not to say" option submits an empty string; the DB
    // CHECK constraint only allows the four values, so store NULL instead.
    if (gender !== undefined) updateData.gender = gender === '' ? null : gender
    if (location !== undefined) updateData.location = location
    if (website !== undefined) updateData.website = website
    if (anime_character !== undefined) updateData.anime_character = anime_character
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
