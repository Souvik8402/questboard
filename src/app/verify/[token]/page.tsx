import type { Metadata } from 'next'
import Link from 'next/link'
import { INSTITUTE_NAME } from '@/lib/constants'
import { getProfileByVerifyToken } from '@/lib/queries'
import { Avatar } from '@/components/Avatar'
import { VerifiedBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { IconLock, IconShield } from '@/components/ui/Icons'
import { StarRating } from '@/components/StarRating'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { IdForm } from '../_components/IdForm'

export const metadata: Metadata = {
  title: 'Verify your identity',
  robots: { index: false, follow: false },
}

/*
 * The link end of item 4.
 *
 * Someone sends you `/verify/<token>` — over WhatsApp, usually, before either of
 * you has committed to anything — and this page opens the ID form with no sign-in
 * step in the way. That is the entire reason the token exists: asking a hirer to
 * make an account before they will prove who they are gets you neither.
 *
 * The token is a bearer credential, so it is deliberately low-value: it identifies
 * one profile and lets you attach an ID to it. It reveals nothing a visitor could
 * not already read off /profile/<id>, and the owner can rotate it from /verify the
 * moment they want it dead.
 */
export default async function VerifyByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const profile = await getProfileByVerifyToken(token)

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={<IconLock className="size-5" />}
          title="This link is no longer valid"
          blurb="Whoever sent it has regenerated theirs, which switches the old URL off immediately. Ask them for a fresh one — it takes them one click."
          action={
            <ButtonLink href="/" variant="secondary" size="sm">
              Go to GigNest
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const firstName = profile.full_name?.split(' ')[0] ?? 'They'

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="space-y-3">
        <p className="eyebrow">Verification link</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-chalk">Verify your </span>
          <span className="gradient-text">identity</span>
        </h1>
        <p className="text-[16px] leading-relaxed text-mist">
          You have been sent a private link. Filling this in tells the other side that a real,
          named person is behind the account — no GigNest account needed at your end.
        </p>
      </div>

      <Panel className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/profile/${profile.id}`}
              className="text-[15px] font-semibold text-chalk hover:text-cyan"
            >
              {profile.full_name ?? 'Someone on GigNest'}
            </Link>
            {profile.id_verified_at && <VerifiedBadge />}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-dim">
            <StarRating value={profile.rating} count={profile.rating_count} size="sm" />
          </div>
        </div>
        <p className="w-full text-[13px] leading-relaxed text-dim sm:w-auto sm:max-w-[15rem]">
          This link belongs to them. Anything you submit here is filed against their account, so
          only fill it in if {firstName} is who asked you.
        </p>
      </Panel>

      <div className="mt-5">
        <IdForm token={token} />
      </div>

      <Notice tone="info" className="mt-5">
        <span className="flex items-start gap-2">
          <IconShield className="mt-0.5 size-4 shrink-0" />
          <span>
            GigNest never asks for a photo of your ID, a scan, an OTP, or a bank detail on this
            page — if any page claiming to be us does, it is not us. We keep the last four digits
            and a one-way hash, and throw the number itself away.
          </span>
        </span>
      </Notice>

      <p className="mt-6 text-center text-[13px] leading-relaxed text-dim">
        GigNest is a paid-work board around {INSTITUTE_NAME}.{' '}
        <Link href="/about" className="text-cyan underline decoration-cyan/40 hover:decoration-cyan">
          What we are
        </Link>{' '}
        ·{' '}
        <Link href="/gigs" className="text-cyan underline decoration-cyan/40 hover:decoration-cyan">
          Browse gigs
        </Link>
      </p>
    </div>
  )
}
