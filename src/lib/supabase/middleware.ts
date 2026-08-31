import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '../config'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Refreshes the Supabase auth token on every request and copies the rotated
 * cookies onto the outgoing response.
 *
 * Without this, access tokens expire after an hour and Server Components start
 * seeing a signed-out user even though the browser still holds a session.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  if (!isSupabaseConfigured) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Do NOT remove: this call is what triggers the refresh.
  await supabase.auth.getUser()

  return response
}
