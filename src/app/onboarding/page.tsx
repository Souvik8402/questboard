import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { demoOnboardingSession, requireSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { INSTITUTE_SHORT } from '@/lib/constants'
import { getSkills } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { Notice, Panel } from '@/components/ui/Panel'
import { OnboardingForm } from './OnboardingForm'

export const metadata: Metadata = {
  title: 'Finish your profile',
  robots: { index: false, follow: false },
}

const REASONS: Record<string, { tone: 'warn' | 'info'; title: string; body: string }> = {
  'student-only': {
    tone: 'warn',
    title: 'That page is for students',
    body: 'Claiming quests needs a verified student account. If you signed in with an institute address, pick "Take on quests" below.',
  },
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const one = (k: string) => {
    const v = params[k]
    return Array.isArray(v) ? v[0] : v
  }

  // Demo mode signs in a half-finished account so this screen is showable with
  // no database. `?as=outsider` is the interesting one: a Gmail address, which
  // is how you demonstrate the student option locking itself.
  const outsider = one('as') === 'outsider'
  const session = isSupabaseConfigured
    ? await requireSession('/onboarding')
    : demoOnboardingSession(outsider)

  const rawNext = one('next') ?? ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
  const reason = one('reason')
  const notice = reason ? REASONS[reason] : undefined

  // The handle_new_user() trigger should have created this row. If it hasn't,
  // the schema was never run — say so instead of rendering a broken form.
  let profile: Profile | null = session.profile
  if (!profile) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.userId)
      .maybeSingle<Profile>()
    profile = data ?? null
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Notice tone="error" title="No profile row for your account">
          Supabase created the login but there is no matching row in <code className="hud">profiles</code>.
          That means <code className="hud">supabase/schema.sql</code> has not been run on this
          project — paste it into the SQL editor and reload this page.
        </Notice>
      </div>
    )
  }

  // Already onboarded and just visiting the URL? Send them on.
  if (profile.onboarded_at && !reason) redirect(next)

  const skills = await getSkills()

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="space-y-3">
        <p className="eyebrow">One last step</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-chalk">Tell us </span>
          <span className="gradient-text">which side you are on</span>
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-mist">
          This decides what the board does for you. Students see quests matched to their skills;
          hirers get the posting tools. {INSTITUTE_SHORT} email holders can do both — post a quest
          and claim one.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <Notice tone="warn" title="Demo mode" className="mt-6">
          Signed in as a sample {outsider ? 'outside hirer' : 'institute'} account,{' '}
          <span className="hud">{session.email}</span>. Nothing here saves.{' '}
          <Link
            href={outsider ? '/onboarding' : '/onboarding?as=outsider'}
            className="text-cyan underline decoration-cyan/40 hover:decoration-cyan"
          >
            {outsider
              ? 'Switch to an @itbhu.ac.in address'
              : 'See it with a non-institute address'}
          </Link>{' '}
          to watch the student option lock and unlock.
        </Notice>
      )}

      {notice && (
        <Notice tone={notice.tone} title={notice.title} className="mt-6">
          {notice.body}
        </Notice>
      )}

      <Panel className="mt-8 p-6 sm:p-8">
        <OnboardingForm
          profile={profile}
          email={session.email}
          eligible={session.isStudentEligible}
          skills={skills}
          next={next}
          presetRole={session.isStudentEligible ? 'student' : 'hirer'}
        />
      </Panel>
    </div>
  )
}
