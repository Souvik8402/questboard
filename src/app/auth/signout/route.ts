import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'

/**
 * Sign out. POST only, so a stray <img src> or link prefetch can't log people
 * out — the nav submits a tiny form to get here.
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[auth/signout]', error)
    }
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
