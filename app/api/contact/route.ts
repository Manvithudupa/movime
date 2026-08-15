import { NextRequest, NextResponse } from 'next/server'
import { getResendClient } from '@/lib/resend'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] as string))

// POST /api/contact - Send a contact form submission via Resend
export async function POST(request: NextRequest) {
  try {
    // Each email costs money (Resend quota) — keep the form heavily rate limited.
    const limited = rateLimit(request, { limit: 5, windowMs: 10 * 60 * 1000, keyPrefix: 'contact' })
    if (!limited.success) return rateLimitResponse(limited)

    const { name, email, subject, message, type } = await request.json()

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Please fill in all required fields' },
        { status: 400 }
      )
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
