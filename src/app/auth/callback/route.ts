import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth / email-confirmation landing point.
 *
 * Supabase sends the browser here with a `code`; we exchange it for a session,
 * which writes the auth cookies. Then we route the user onward: to onboarding if
 * they have no profile row yet, otherwise wherever they were headed.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin))

  if (!isSupabaseConfigured) return fail('exchange_failed')

  // Google reports user-side cancellation in the query string.
  if (url.searchParams.get('error')) {
    return NextResponse.redirect(
      new URL(`/login?error=${url.searchParams.get('error')}`, url.origin),
    )
  }

  if (!code) return fail('no_code')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchange failed:', error?.message)
    return fail('exchange_failed')
  }

  // The handle_new_user() trigger creates the profile row, but a first-time user
  // still needs to choose a role — send them through onboarding.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', data.user.id)
    .maybeSingle<{ onboarded_at: string | null }>()

  const needsOnboarding = !profile?.onboarded_at

  return NextResponse.redirect(
    new URL(needsOnboarding ? `/onboarding?next=${encodeURIComponent(next)}` : next, url.origin),
  )
}
