import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL, hasServiceRole, isSupabaseConfigured } from '../config'

/**
 * ⚠️  SERVICE-ROLE CLIENT — BYPASSES EVERY RLS POLICY.
 *
 * Only the admin panel uses this, and only from the server. The runtime guard
 * below is a tripwire: if this module is ever pulled into a client bundle by
 * accident, it throws loudly instead of silently shipping your master key to
 * a browser.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminClient() was called in the browser. The service-role key must ' +
        'never leave the server — check your imports.',
    )
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL first.')
  }

  if (!hasServiceRole) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing. The admin panel needs it to read ' +
        'across all users. Find it in Supabase → Project Settings → API.',
    )
  }

  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
