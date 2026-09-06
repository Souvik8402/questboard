/**
 * Environment plumbing.
 *
 * The app has two modes:
 *
 *   CONFIGURED  — Supabase env vars present. Real auth, real database.
 *   DEMO        — no env vars. Pages render a built-in sample dataset and
 *                 every write is refused with a friendly message.
 *
 * Demo mode exists so `npm run dev` shows a working product seconds after
 * install, and so a flaky-wifi pitch still has something to show.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export function looksReal(value: string): boolean {
  // The .env.local.example placeholders all shout in caps; treat them as unset
  // so a half-filled file degrades to demo mode instead of throwing.
  return value.length > 0 && !value.includes('YOUR-') && !value.includes('your-')
}

export const isSupabaseConfigured = looksReal(SUPABASE_URL) && looksReal(SUPABASE_ANON_KEY)

/** Server-only. Never import this into a client component. */
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export const hasServiceRole = looksReal(SERVICE_ROLE_KEY)

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit && looksReal(explicit)) return explicit.replace(/\/$/, '')
  // Vercel sets this automatically on preview + production deployments.
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export const DEMO_NOTICE =
  'Demo mode — add your Supabase keys to .env.local to enable sign-in and posting.'
