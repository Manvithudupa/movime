import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const sendMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/resend', () => ({
  getResendClient: () => ({ emails: { send: sendMock } }),
}))

import { POST } from '../../app/api/contact/route'

let ipCounter = 0

function makeRequest(body: Record<string, unknown>, ip?: string) {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost',
      'x-forwarded-for': ip ?? `203.0.113.${++ipCounter}`,
    },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Broken player',
  message: 'The player does not start.',
  type: 'bug',
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    sendMock.mockReset()
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    process.env.RESEND_API_KEY = 'test-key'
    process.env.CONTACT_TO_EMAIL = 'support@example.com'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('sends a valid submission and labels the allowlisted type', async () => {
    const response = await POST(makeRequest(validBody))
    expect(response.status).toBe(200)

    const payload = sendMock.mock.calls[0][0]
    expect(payload.subject).toBe('[Movime Contact] Bug Report: Broken player')
    expect(payload.html).toContain('Ada Lovelace')
  })

  it('defaults a missing type to General', async () => {
    const { type: _type, ...withoutType } = validBody
    const response = await POST(makeRequest(withoutType))
    expect(response.status).toBe(200)
    expect(sendMock.mock.calls[0][0].subject).toContain('General:')
  })

  it('rejects a type outside the allowlist', async () => {
    const response = await POST(makeRequest({ ...validBody, type: 'admin' }))
    expect(response.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('rejects a non-string type', async () => {
    const response = await POST(makeRequest({ ...validBody, type: 7 }))
    expect(response.status).toBe(400)
  })

  it('strips CR/LF and control characters from the subject and name', async () => {
    const response = await POST(
      makeRequest({
        ...validBody,
        name: 'Ada\r\nBcc: evil@example.com',
        subject: 'Hello\r\nX-Injected: yes\u0007',
        type: 'support',
      })
    )
    expect(response.status).toBe(200)

    const payload = sendMock.mock.calls[0][0]
    expect(payload.subject).not.toMatch(/[\r\n\u0007]/)
    expect(payload.subject).toBe('[Movime Contact] Technical Support: Hello X-Injected: yes')
    expect(payload.html).not.toContain('\r\nBcc:')
    expect(payload.html).toContain('Ada Bcc: evil@example.com')
  })

  it('rejects a type that only differs from the allowlist by control characters', async () => {
    const response = await POST(makeRequest({ ...validBody, type: 'bug\r\n' }))
    // Trailing CR/LF is stripped, so the value is the allowlisted "bug".
    expect(response.status).toBe(200)
    expect(sendMock.mock.calls[0][0].subject).toContain('Bug Report:')
  })

  it('rejects a subject that is empty after sanitizing', async () => {
    const response = await POST(makeRequest({ ...validBody, subject: '\r\n\t' }))
    expect(response.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('rejects missing required fields', async () => {
    const response = await POST(makeRequest({ ...validBody, name: '' }))
    expect(response.status).toBe(400)
  })

  it('rejects cross-site submissions', async () => {
    const request = new NextRequest('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host: 'localhost',
        origin: 'https://evil.example',
        'x-forwarded-for': `203.0.113.${++ipCounter}`,
      },
      body: JSON.stringify(validBody),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
