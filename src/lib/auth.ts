import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from './config'
import { isInstituteEmail } from './constants'
import { DEMO_ME, DEMO_ME_EMAIL, DEMO_VERIFY_TOKEN, demoReferralCode } from './demo-data'
import { PROFILE_ALL_FIELDS } from './queries'
import { createClient } from './supabase/server'
import type { Profile } from './types'

export interface SessionInfo {
  userId: string
  email: string | null
  profile: Profile | null
  /** True when the signed-in email belongs to an institute domain. */
  isStudentEligible: boolean
}

/**
 * Current session, or null. Never throws — in demo mode it simply returns null
 * so pages render their signed-out state.
 */
export async function getSession(): Promise<SessionInfo | null> {
  if (!isSupabaseConfigured) return null

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select(PROFILE_ALL_FIELDS)
      .eq('id', user.id)
      .maybeSingle<Profile>()

    return {
      userId: user.id,
      email: user.email ?? null,
      profile: profile ?? null,
      isStudentEligible: isInstituteEmail(user.email),
    }
  } catch {
    return null
  }
}

/** Redirects to /login if not signed in. */
export async function requireSession(returnTo?: string): Promise<SessionInfo> {
  const session = await getSession()
  if (!session) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login')
  }
  return session
}

/** Redirects to /login, then /onboarding, until a profile exists. */
export async function requireProfile(
  returnTo?: string,
): Promise<SessionInfo & { profile: Profile }> {
  const session = await requireSession(returnTo)
  if (!session.profile) redirect('/onboarding')
  return session as SessionInfo & { profile: Profile }
}

/**
 * Guard for anything that claims work.
 *
 * This used to be `requireStudent()` and used to bounce anyone whose email was
 * not an institute one. It no longer does: **anyone with an account may apply for
 * a gig**, which is the marketplace. All that is left is "be onboarded and not
 * banned", matching the applications INSERT policy in schema.sql.
 *
 * The institute check did not disappear — it moved to the fee waiver, where it
 * costs nobody a job. See `qualifiesForWaiver()` below.
 */
export async function requireApplier(
  returnTo?: string,
): Promise<SessionInfo & { profile: Profile }> {
  const session = await requireProfile(returnTo)
  if (session.profile.is_banned) redirect('/gigs?reason=banned')
  return session
}

export function isStudent(profile: Profile | null | undefined): boolean {
  return profile?.role === 'student'
}

/** Does this account pay ₹0 platform fee? Only an approved waiver counts. */
export function hasFeeWaiver(profile: Profile | null | undefined): boolean {
  return profile?.fee_waiver_status === 'approved'
}

/**
 * Can this account even ask for the waiver? The trigger in schema.sql will only
 * let an institute mailbox hold role='student', so that role is the marker.
 */
export function qualifiesForWaiver(session: SessionInfo | null | undefined): boolean {
  if (!session) return false
  return session.isStudentEligible || session.profile?.role === 'student'
}

/**
 * A signed-in applier, for demo mode only.
 *
 * `getSession()` deliberately still returns null without Supabase — signed-out is
 * the honest default for public pages. But `/dashboard`, `/inbox`, `/verify` and
 * `/profile/edit` have nothing to show a signed-out visitor except a redirect,
 * and those are exactly the pages you want to demo. So they opt into this
 * persona instead.
 *
 * Safe by construction: every Server Action checks `isSupabaseConfigured`
 * before touching the database, so nothing this session "does" can be written.
 */
export function demoSession(): SessionInfo & { profile: Profile } {
  const now = new Date().toISOString()

  return {
    userId: DEMO_ME.id,
    email: DEMO_ME_EMAIL,
    isStudentEligible: true,
    profile: {
      ...DEMO_ME,
      bio: 'Third-year CSE. Built the Technex registration site, shoot film photos on weekends, and I answer messages within a couple of hours.',
      is_banned: false,
      onboarded_at: now,
      // An approved waiver, so the ₹0-fee state is the one you see on screen.
      fee_waiver_status: 'approved',
      fee_waiver_note: 'ID card photo matched the name on the account. Waiver applied.',
      fee_waiver_decided_at: now,
      mentorships: 0,
      referral_code: demoReferralCode(DEMO_ME.id),
      referred_by: null,
      verify_token: DEMO_VERIFY_TOKEN,
      created_at: now,
      updated_at: now,
    },
  }
}

/**
 * A half-finished signup, for demo mode only.
 *
 * /onboarding is where the fee-waiver story is visible — the student option locks
 * itself unless the signed-in address is an institute one, and the copy explains
 * that this only affects the fee, never the right to apply. `outsider: true` swaps
 * in a Gmail address, which is the version that demonstrates the lock.
 */
export function demoOnboardingSession(outsider: boolean): SessionInfo & { profile: Profile } {
  const session = demoSession()

  return {
    ...session,
    email: outsider ? 'ananya.gupta@gmail.com' : session.email,
    isStudentEligible: !outsider,
    profile: {
      ...session.profile,
      full_name: outsider ? 'Ananya Gupta' : session.profile.full_name,
      role: outsider ? 'hirer' : 'student',
      department: null,
      year: null,
      bio: null,
      onboarded_at: null,
      fee_waiver_status: 'none',
      fee_waiver_note: null,
      fee_waiver_decided_at: null,
    },
  }
}
