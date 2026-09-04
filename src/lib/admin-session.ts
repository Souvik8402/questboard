/**
 * Admin session cookie.
 *
 * The admin panel is password-gated ("with password just for now"). To make
 * that gate real rather than decorative:
 *
 *   • the password is compared in constant time, not with `===`
 *   • the resulting cookie is an HMAC over an expiry timestamp, so it cannot be
 *     forged by anyone who does not hold ADMIN_SECRET
 *   • the cookie is httpOnly + sameSite=lax, so page JS can never read it
 *
 * Everything here uses Web Crypto rather than node:crypto, because middleware
 * runs on the Edge runtime where node:crypto is unavailable. Web Crypto exists
 * in both, so the same code guards the middleware and the admin layout.
 *
 * Upgrade path: delete this file, give yourself `role = 'admin'` in the
 * profiles table (see seed.sql) and check that instead.
 */

export const ADMIN_COOKIE = 'gn_admin'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours
const DEFAULT_PASSWORD = 'change-me-before-you-demo'

const encoder = new TextEncoder()

function secret(): string | null {
  const value = process.env.ADMIN_SECRET
  if (!value || value.length < 16) return null
  return value
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secretValue: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretValue),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)))
}

async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/**
 * Constant-time compare of two equal-length hex digests. Because both sides are
 * hashed first, the input lengths never affect timing.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function checkAdminPassword(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false

  const [a, b] = await Promise.all([sha256Hex(candidate), sha256Hex(expected)])
  return constantTimeEqual(a, b)
}

export function adminConfigError(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) return 'ADMIN_PASSWORD is not set in .env.local — the admin panel is disabled.'
  if (pw === DEFAULT_PASSWORD) {
    return 'ADMIN_PASSWORD is still the placeholder from .env.local.example. Change it before you demo.'
  }
  if (!secret()) {
    return 'ADMIN_SECRET is missing or shorter than 16 characters, so admin sessions cannot be signed.'
  }
  return null
}

/** `<expiresAt>.<hmac>` */
export async function issueAdminToken(): Promise<string | null> {
  const key = secret()
  if (!key) return null

  const expiresAt = String(Date.now() + SESSION_TTL_MS)
  return `${expiresAt}.${await hmacHex(key, expiresAt)}`
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  const key = secret()
  if (!key || !token) return false

  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false

  const expiresAt = token.slice(0, dot)
  const mac = token.slice(dot + 1)

  if (!constantTimeEqual(mac, await hmacHex(key, expiresAt))) return false

  const ts = Number(expiresAt)
  return Number.isFinite(ts) && ts > Date.now()
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
}
