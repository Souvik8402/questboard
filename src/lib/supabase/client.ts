'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '../config'

/**
 * Supabase client for the browser. Used only where we genuinely need the
 * client side: starting the Google OAuth redirect and signing out.
 *
 * Everything that writes data goes through a Server Action instead.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.local.example to .env.local and fill it in.',
    )
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
