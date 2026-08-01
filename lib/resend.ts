import { Resend } from 'resend'

let client: Resend | null = null

// Lazily create the Resend client so that importing this module never throws
// when RESEND_API_KEY is not configured yet.
export const getResendClient = (): Resend => {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY)
  }
  return client
}
