import type { Metadata } from 'next'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { getSkills } from '@/lib/queries'
import { ButtonLink } from '@/components/ui/Button'
import { Notice, Panel } from '@/components/ui/Panel'
import { IconArrowLeft, IconCoins, IconShield, IconUsers } from '@/components/ui/Icons'
import { NewGigForm } from './NewGigForm'

export const metadata: Metadata = {
  title: 'Post a gig',
  description:
    'Post paid work around Varanasi — one-off tasks, weekly help, part-time roles or internships. Anyone can post, anyone can apply.',
}

export default async function NewGigPage() {
  const [session, skills] = await Promise.all([getSession(), getSkills()])

  const needsAuth = isSupabaseConfigured && !session
  const needsOnboarding = isSupabaseConfigured && session && !session.profile?.onboarded_at

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/gigs"
        className="inline-flex items-center gap-1.5 text-[14px] text-dim transition-colors hover:text-cyan"
      >
        <IconArrowLeft className="size-3.5" />
        All gigs
      </Link>

      <div className="mt-5 space-y-2">
        <p className="eyebrow">Hire from campus</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-chalk">Post a </span>
          <span className="gradient-text">gig</span>
        </h1>
        <p className="max-w-xl text-[15.5px] leading-relaxed text-mist">
          Anyone can post and anyone can apply — no institute email needed on either side. Students
          who verify theirs simply pay no platform fee.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: <IconCoins className="size-4" />, label: 'Free to post', hint: 'No listing fee, no cut' },
          { icon: <IconUsers className="size-4" />, label: 'Open to everyone', hint: 'Students verify for ₹0 fee' },
          { icon: <IconShield className="size-4" />, label: 'No contact details', hint: 'A private thread on hire' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-line bg-black/[0.02] px-3.5 py-3"
          >
            <p className="flex items-center gap-2 text-[13.5px] font-medium text-chalk">
              <span className="text-cyan">{item.icon}</span>
              {item.label}
            </p>
            <p className="mt-0.5 pl-6 text-[12.5px] text-dim">{item.hint}</p>
          </div>
        ))}
      </div>

      {needsAuth ? (
        <Panel className="mt-8 p-6">
          <h2 className="text-base font-semibold text-chalk">Sign in to post</h2>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-mist">
            Any email works for posting — Google, or a password account. We ask for an account so
            applicants know who they are talking to, and so you can manage who applies.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/login?next=/gigs/new">Sign in or sign up</ButtonLink>
            <ButtonLink href="/gigs" variant="ghost">
              Browse gigs first
            </ButtonLink>
          </div>
        </Panel>
      ) : needsOnboarding ? (
        <div className="mt-8">
          <Notice tone="info" title="One step first">
            Finish your profile — name and role — and you can post straight away.{' '}
            <Link href="/onboarding?next=/gigs/new" className="underline hover:text-chalk">
              Go to setup
            </Link>
          </Notice>
        </div>
      ) : (
        <div className="mt-8">
          {!isSupabaseConfigured && (
            <div className="mb-5">
              <Notice tone="warn" title="Demo mode">
                The form works and validates, but nothing can be saved without a database. Add your
                Supabase keys to <span className="hud">.env.local</span> to go live.
              </Notice>
            </div>
          )}
          <NewGigForm skills={skills} />
        </div>
      )}
    </div>
  )
}
