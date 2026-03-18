/**
 * Smart OTP System — supports Email (Supabase) and Phone/SMS (Twilio via Supabase)
 *
 * Modes:
 *   1. Supabase configured → real OTP via Supabase Auth (email or SMS via Twilio)
 *   2. Supabase NOT configured → demo mode (in-memory, code shown in toast)
 */
import { supabase } from './supabase'

// In-memory store for demo mode { contact: { code, expiry } }
const demoStore = {}

export function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  return url.startsWith('https://') && !url.includes('your-project')
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Normalize phone to E.164 format.
 * If no country code, defaults to +91 (India).
 */
export function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  if (raw.startsWith('+')) return raw.replace(/\s/g, '')
  return `+${digits}`
}

/**
 * Send OTP.
 * @param {string} contact  - email address or phone number
 * @param {'email'|'phone'} type
 * @returns {{ demo: boolean, code?: string }}
 */
export async function sendOTP(contact, type = 'email') {
  if (!contact) throw new Error('Contact is required')

  if (isSupabaseConfigured()) {
    let error
    if (type === 'phone') {
      const phone = normalizePhone(contact)
      ;({ error } = await supabase.auth.signInWithOtp({ phone }))
    } else {
      ;({ error } = await supabase.auth.signInWithOtp({ email: contact }))
    }
    if (error) throw new Error(error.message)
    return { demo: false }
  }

  // Demo mode
  const code = generateCode()
  demoStore[contact.toLowerCase()] = { code, expiry: Date.now() + 10 * 60 * 1000 }
  return { demo: true, code }
}

/**
 * Verify OTP.
 * @param {string} contact
 * @param {string} token   - 6-digit code
 * @param {'email'|'phone'} type
 */
export async function verifyOTP(contact, token, type = 'email') {
  if (!contact || !token) throw new Error('Contact and OTP are required')

  if (isSupabaseConfigured()) {
    let data, error
    if (type === 'phone') {
      const phone = normalizePhone(contact)
      ;({ data, error } = await supabase.auth.verifyOtp({ phone, token: token.trim(), type: 'sms' }))
    } else {
      ;({ data, error } = await supabase.auth.verifyOtp({ email: contact, token: token.trim(), type: 'email' }))
    }
    if (error) throw new Error('Invalid or expired OTP. Please try again.')
    return data?.user || { id: 'verified', contact }
  }

  // Demo mode verification
  const stored = demoStore[contact.toLowerCase()]
  if (!stored)                  throw new Error('No OTP sent. Please request a new code.')
  if (Date.now() > stored.expiry) { delete demoStore[contact.toLowerCase()]; throw new Error('OTP expired. Please resend.') }
  if (stored.code !== token.trim()) throw new Error('Incorrect OTP. Please try again.')
  delete demoStore[contact.toLowerCase()]
  return { id: 'demo', contact }
}
