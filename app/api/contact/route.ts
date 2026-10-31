import { NextRequest, NextResponse } from 'next/server'
import { getResendClient } from '@/lib/resend'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'
import { isSameOrigin } from '@/lib/requestGuard'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] as string))

// Reasonable caps so a single request can't blow up the email payload or
// abuse the reply-to field.
const MAX_NAME = 100
const MAX_SUBJECT = 200
const MAX_MESSAGE = 5000
const MAX_EMAIL = 254
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Must stay in sync with the <select> options in app/contact/page.tsx.
const INQUIRY_TYPES = ['general', 'support', 'bug', 'feature', 'privacy', 'other'] as const
type InquiryType = (typeof INQUIRY_TYPES)[number]
const DEFAULT_INQUIRY: InquiryType = 'general'

const INQUIRY_LABELS: Record<InquiryType, string> = {
  general: 'General',
  support: 'Technical Support',
  bug: 'Bug Report',
  feature: 'Feature Request',
  privacy: 'Privacy Concern',
  other: 'Other',
}

/**
 * Header injection defence: CR/LF inside a header value (here the email
 * subject) can inject additional headers, and other control characters have no
 * place in a name/subject/type. Collapse every C0 control and DEL to a space,
 * so the remaining text stays readable instead of being concatenated.
 */
const stripControlChars = (value: string) =>
  value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()

const isInquiryType = (value: string): value is InquiryType =>
  (INQUIRY_TYPES as readonly string[]).includes(value)

// POST /api/contact - Send a contact form submission via Resend
export async function POST(request: NextRequest) {
  try {
    // Block cross-site form posts (spam bots submit from other origins).
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Each email costs money (Resend quota) — keep the form heavily rate limited.
    const limited = await rateLimitGlobal(request, { limit: 5, windowMs: 10 * 60 * 1000, keyPrefix: 'contact' })
    if (!limited.success) return rateLimitResponse(limited)

    const body = await request.json().catch(() => ({}))
    const { name, email, subject, message, type } = body || {}

    // Validate presence, types, formats, and sizes server-side (the form's
    // HTML5 attributes only apply to real browsers).
    if (
      typeof name !== 'string' || !name.trim() || name.length > MAX_NAME ||
      typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > MAX_EMAIL ||
      typeof subject !== 'string' || !subject.trim() || subject.length > MAX_SUBJECT ||
      typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE
    ) {
      return NextResponse.json(
        { error: 'Please fill in all required fields correctly' },
        { status: 400 }
      )
    }

    // Sanitize before validating again: stripping control characters can empty
    // a field that only contained newlines.
    const safeName = stripControlChars(name)
    const safeSubject = stripControlChars(subject)
    if (!safeName || safeName.length > MAX_NAME || !safeSubject || safeSubject.length > MAX_SUBJECT) {
      return NextResponse.json(
        { error: 'Please fill in all required fields correctly' },
        { status: 400 }
      )
    }

    let inquiryType: InquiryType = DEFAULT_INQUIRY
    if (type !== undefined) {
      if (typeof type !== 'string') {
        return NextResponse.json({ error: 'Invalid inquiry type' }, { status: 400 })
      }
      // Allowlisted values only — anything else is rejected rather than
      // silently folded into "General", so a tampered payload cannot smuggle
      // arbitrary text into the email subject.
      const normalized = stripControlChars(type).toLowerCase()
      if (!isInquiryType(normalized)) {
        return NextResponse.json({ error: 'Invalid inquiry type' }, { status: 400 })
      }
      inquiryType = normalized
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Contact error: RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Contact email is not configured yet. Please try again later.' },
        { status: 500 }
      )
    }

    const to = process.env.CONTACT_TO_EMAIL
    if (!to) {
      console.error('Contact error: CONTACT_TO_EMAIL is not configured')
      return NextResponse.json(
        { error: 'Contact email is not configured yet. Please try again later.' },
        { status: 500 }
      )
    }

    const typeLabel = INQUIRY_LABELS[inquiryType]

    const { data, error } = await getResendClient().emails.send({
      from: process.env.RESEND_EMAIL_FROM || 'Movime <onboarding@resend.dev>',
      to: [to],
      replyTo: email,
      subject: `[Movime Contact] ${typeLabel}: ${safeSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #111827; margin-top: 0;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827; width: 120px;">Name</td>
              <td style="padding: 8px 0;">${escapeHtml(safeName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">Type</td>
              <td style="padding: 8px 0;">${escapeHtml(typeLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">Subject</td>
              <td style="padding: 8px 0;">${escapeHtml(safeSubject)}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 14px; color: #374151; white-space: pre-wrap;">
            ${escapeHtml(message)}
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Contact error: Resend send failed:', error)
      return NextResponse.json(
        { error: 'Failed to send your message. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('Contact error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
