import { NextRequest, NextResponse } from 'next/server'
import { getResendClient } from '@/lib/resend'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
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

// POST /api/contact - Send a contact form submission via Resend
export async function POST(request: NextRequest) {
  try {
    // Block cross-site form posts (spam bots submit from other origins).
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Each email costs money (Resend quota) — keep the form heavily rate limited.
    const limited = rateLimit(request, { limit: 5, windowMs: 10 * 60 * 1000, keyPrefix: 'contact' })
    if (!limited.success) return rateLimitResponse(limited)

    const body = await request.json().catch(() => ({}))
    const { name, email, subject, message, type } = body

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

    if (type !== undefined && typeof type !== 'string') {
      return NextResponse.json({ error: 'Invalid inquiry type' }, { status: 400 })
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

    const { data, error } = await getResendClient().emails.send({
      from: process.env.RESEND_EMAIL_FROM || 'Movime <onboarding@resend.dev>',
      to: [to],
      replyTo: email,
      subject: `[Movime Contact] ${type || 'General'}: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #111827; margin-top: 0;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827; width: 120px;">Name</td>
              <td style="padding: 8px 0;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">Type</td>
              <td style="padding: 8px 0;">${escapeHtml(type || 'General')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">Subject</td>
              <td style="padding: 8px 0;">${escapeHtml(subject)}</td>
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
