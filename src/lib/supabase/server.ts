import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '../config'

/** What Supabase hands back to `setAll`. Annotated because the callback sits in
 *  an object literal, where TS can't infer it from the generic signature. */
type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Reads the session from the request cookies, so every query runs as the
 * signed-in user and RLS applies. This is the client that should be used for
 * essentially everything.
 */
export async function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.local.example to .env.local and fill it in.',
    )
  }

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot write cookies. That's fine — middleware
          // refreshes the session on every request, so the token stays fresh.
        }
      },
    },
  })
}
