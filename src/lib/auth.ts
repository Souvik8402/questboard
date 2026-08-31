import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from './config'
import { isInstituteEmail } from './constants'
import { DEMO_ME, DEMO_ME_EMAIL } from './demo-data'
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
      .select('*')
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
 * Guard for anything that claims work. The database enforces this too — see
 * `is_active_student()` and the applications INSERT policy — this only exists
 * so the user gets a page instead of a Postgres error.
 */
export async function requireStudent(
  returnTo?: string,
): Promise<SessionInfo & { profile: Profile }> {
  const session = await requireProfile(returnTo)
  if (session.profile.role !== 'student') redirect('/onboarding?reason=student-only')
  return session
}

export function isStudent(profile: Profile | null | undefined): boolean {
  return profile?.role === 'student'
}

/**
 * A signed-in student, for demo mode only.
 *
 * `getSession()` deliberately still returns null without Supabase — signed-out
 * is the honest default for public pages, and it keeps the "@itbhu.ac.in only"
 * pitch visible on the quest board. But `/dashboard` and `/profile/edit` have
 * nothing to show a signed-out visitor except a redirect, and those are exactly
 * the pages you want to demo. So they opt into this persona instead.
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
      created_at: now,
      updated_at: now,
    },
  }
}

/**
 * A half-finished signup, for demo mode only.
 *
 * /onboarding is where the whole exclusivity story is visible — the student
 * option locks itself unless the signed-in address is an institute one — so it
 * is worth being able to show without a database. `outsider: true` swaps in a
 * Gmail address, which is the version that demonstrates the lock.
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
    },
  }
}
