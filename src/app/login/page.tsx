import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { INSTITUTE_NAME, INSTITUTE_SHORT } from '@/lib/constants'
import { Panel, Notice } from '@/components/ui/Panel'
import { IconArrowLeft, IconCheck, IconShield } from '@/components/ui/Icons'
import { GoogleButton } from './GoogleButton'
import { PasswordForm } from './PasswordForm'

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in to GigNest. ${INSTITUTE_NAME} students verify with Google; anyone can create a hirer account.`,
}

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  exchange_failed:
    'We could not complete the sign-in handshake. Try again — if it keeps failing, check that the callback URL is registered in Supabase.',
  no_code: 'Google sent us back without an authorisation code. Please try again.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const one = (k: string) => {
    const v = params[k]
    return Array.isArray(v) ? v[0] : v
  }

  const session = await getSession()
  if (session) redirect(session.profile ? '/dashboard' : '/onboarding')

  const rawNext = one('next') ?? ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
  const mode = one('mode') === 'signup' ? 'signup' : 'signin'
  const oauthError = one('error')

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-20 lg:px-8">
      {/* Left: the pitch, so the page isn't a bare form */}
      <div className="space-y-8">
        <Link
          href="/gigs"
          className="inline-flex items-center gap-1.5 text-[14px] text-mist transition-colors hover:text-chalk"
        >
          <IconArrowLeft className="size-3.5" />
          Back to the gig board
        </Link>

        <div className="space-y-4">
          <p className="eyebrow">Two ways in</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span className="text-chalk">One board.</span>{' '}
            <span className="gradient-text">Two kinds of account.</span>
          </h1>
          <p className="max-w-md text-[16px] leading-relaxed text-mist">
            Whether you are looking for work or looking for someone to do it, you start in the same
            place.
          </p>
        </div>

        <div className="space-y-3">
          <Panel className="flex gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet/25 bg-violet/10 text-violet">
              <IconShield className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-chalk">
                {INSTITUTE_SHORT} student? Use Google.
              </p>
              <p className="text-[14px] leading-relaxed text-mist">
                Signing in with your <span className="hud text-chalk">@itbhu.ac.in</span> Google
                account is what proves you study here. It is the only route to claiming gigs.
              </p>
            </div>
          </Panel>

          <Panel className="flex gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
              <IconCheck className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-chalk">Want to hire? Any email works.</p>
              <p className="text-[14px] leading-relaxed text-mist">
                Shopkeepers, startups, professors, parents, alumni — create an account with an email
                and password and post in a couple of minutes.
              </p>
            </div>
          </Panel>
        </div>
      </div>

      {/* Right: the actual form */}
      <Panel className="h-fit p-6 sm:p-8">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-chalk">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-[14px] text-mist">
            {mode === 'signup'
              ? 'Students should use the Google button — it verifies you instantly.'
              : 'Sign in to post a gig, apply to one, or check your dashboard.'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <Notice tone="warn" title="Demo mode" className="mt-5">
            No Supabase keys are configured, so sign-in is switched off. Everything else on the site
            runs on sample data — browse the gig board to see it.
          </Notice>
        )}

        {oauthError && (
          <Notice tone="error" className="mt-5">
            {OAUTH_ERRORS[oauthError] ?? 'Google sign-in did not complete. Please try again.'}
          </Notice>
        )}

        <div className="mt-6 space-y-5">
          <GoogleButton
            next={next}
            disabled={!isSupabaseConfigured}
            label={mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
          />

          <div className="flex items-center gap-3">
            <div className="hairline flex-1" />
            <span className="text-[12px] uppercase tracking-widest text-dimmer">or</span>
            <div className="hairline flex-1" />
          </div>

          <PasswordForm mode={mode} next={next} />

          <p className="text-center text-[14px] text-mist">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <Link
                  href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
                  className="font-medium text-cyan hover:underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link
                  href={`/login?mode=signup${next !== '/dashboard' ? `&next=${encodeURIComponent(next)}` : ''}`}
                  className="font-medium text-cyan hover:underline"
                >
                  Create a hirer account
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-[12.5px] leading-relaxed text-dimmer">
          By continuing you agree that payments are settled directly between hirer and student.
          GigNest does not hold funds.
        </p>
      </Panel>
    </div>
  )
}
