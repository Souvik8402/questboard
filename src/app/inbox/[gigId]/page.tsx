import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { demoSession, requireProfile } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { DISPUTE_SLA_LABEL, GIG_TYPE_LABEL } from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import { getGig, getPublicProfile, getThreadMessages } from '@/lib/queries'
import { Badge, StatusPill, VerifiedBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { IconArrowLeft, IconScale, IconShield } from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'
import { StarRating } from '@/components/StarRating'
import { ThreadClient } from './ThreadClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gigId: string }>
}): Promise<Metadata> {
  const { gigId } = await params
  const gig = await getGig(gigId)
  return { title: gig ? `Thread · ${gig.title}` : 'Thread' }
}

/**
 * One gig thread.
 *
 * Participation is checked here so a wrong URL 404s instead of rendering an
 * empty shell, but that check is not what protects the data — the `messages`
 * RLS policy in schema.sql refuses to return rows to anyone who is not the hirer
 * or the person hired, whatever this page does.
 */
export default async function ThreadPage({ params }: { params: Promise<{ gigId: string }> }) {
  const { gigId } = await params

  const { userId, profile } = isSupabaseConfigured
    ? await requireProfile(`/inbox/${gigId}`)
    : demoSession()

  const gig = await getGig(gigId)
  if (!gig) notFound()

  const isHirer = gig.hirer_id === userId
  const isAssignee = gig.assigned_to === userId
  if (!isHirer && !isAssignee) notFound()

  const otherId = isHirer ? gig.assigned_to : gig.hirer_id
  const [messages, counterparty] = await Promise.all([
    getThreadMessages(gig.id, userId),
    isHirer && otherId ? getPublicProfile(otherId) : Promise.resolve(gig.hirer),
  ])

  const closed = gig.status === 'completed' || gig.status === 'cancelled'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-1.5 text-[14px] text-dim transition-colors hover:text-cyan"
      >
        <IconArrowLeft className="size-3.5" />
        Inbox
      </Link>

      {/* Who and what — the two questions you have when you open a thread */}
      <Panel className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar
              name={counterparty?.full_name}
              src={counterparty?.avatar_url}
              size="lg"
            />
            <div className="min-w-0 space-y-1">
              <Link
                href={counterparty ? `/profile/${counterparty.id}` : '#'}
                className="block truncate text-[16px] font-semibold text-chalk hover:text-cyan"
              >
                {counterparty?.full_name ?? 'Someone'}
              </Link>
              <p className="text-[12.5px] text-dim">
                {isHirer ? 'You hired them for this gig' : 'They hired you for this gig'}
              </p>
              <StarRating
                value={counterparty?.rating ?? 0}
                count={counterparty?.rating_count ?? 0}
                size="sm"
              />
              {counterparty?.id_verified_at && (
                <VerifiedBadge label={isHirer ? 'Verified applier' : 'Verified hirer'} />
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StatusPill status={gig.status} />
            <span className="hud text-[15px] text-lime">{formatRupees(gig.reward_amount)}</span>
            <Badge>{GIG_TYPE_LABEL[gig.gig_type]}</Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
          <div className="min-w-0">
            <p className="eyebrow">The gig</p>
            <Link
              href={`/gigs/${gig.id}`}
              className="mt-0.5 block truncate text-[14.5px] font-medium text-chalk hover:text-cyan"
            >
              {gig.title}
            </Link>
            <p className="mt-0.5 text-[12px] text-dim">
              Hired {relativeTime(gig.updated_at)}
            </p>
          </div>
          <ButtonLink href={`/gigs/${gig.id}`} variant="secondary" size="sm">
            Open the gig
          </ButtonLink>
        </div>
      </Panel>

      <div className="mt-5">
        <ThreadClient
          gigId={gig.id}
          viewerId={userId}
          me={profile}
          initial={messages}
          demo={!isSupabaseConfigured}
          closed={closed}
        />
      </div>

      <Panel className="mt-6 p-4">
        <p className="inline-flex items-start gap-2 text-[12.5px] leading-relaxed text-mist">
          <IconShield className="mt-0.5 size-3.5 shrink-0 text-cyan" />
          <span>
            This is the only channel between the two of you — no phone number and no email address
            is shared, in either direction. Messages cannot be edited or deleted.
          </span>
        </p>
        <p className="mt-2.5 inline-flex items-start gap-2 text-[12.5px] leading-relaxed text-mist">
          <IconScale className="mt-0.5 size-3.5 shrink-0 text-amber" />
          <span>
            If something goes wrong, raise it from{' '}
            <Link href={`/gigs/${gig.id}`} className="text-cyan hover:underline">
              the gig page
            </Link>
            . An admin reads both sides and this whole thread — average resolution is{' '}
            {DISPUTE_SLA_LABEL}.
          </span>
        </p>
      </Panel>
    </div>
  )
}
