import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import type { ApplierStats } from '@/lib/badges'
import { isSupabaseConfigured } from '@/lib/config'
import {
  DISPUTE_SLA_LABEL,
  DISPUTE_WINDOW_HOURS,
  GIG_TYPE_LABEL,
  PLATFORM_FEE_LABEL,
  rewardTier,
} from '@/lib/constants'
import {
  deadlineInfo,
  disputeWindow,
  formatDate,
  formatRupees,
  relativeTime,
} from '@/lib/format'
import {
  getApplierStats,
  getDisputesFor,
  getMyApplicationFor,
  getGig,
  getGigApplications,
  hasReviewed,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { Badge, SkillChip, StatusPill, VerifiedBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Notice, Panel } from '@/components/ui/Panel'
import {
  IconArrowLeft,
  IconBolt,
  IconChat,
  IconClock,
  IconEye,
  IconMapPin,
  IconShield,
  IconUsers,
  IconWifi,
} from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'
import { MapLoader } from '@/components/MapLoader'
import { StarRating } from '@/components/StarRating'
import { ApplicantList } from './_components/ApplicantList'
import { ApplyForm } from './_components/ApplyForm'
import { DisputePanel } from './_components/DisputePanel'
import { ReviewForm } from './_components/ReviewForm'
import { StatusControls } from './_components/StatusControls'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const gig = await getGig(id)
  if (!gig) return { title: 'Gig not found' }

  return {
    title: gig.title,
    description: `${formatRupees(gig.reward_amount)} · ${
      GIG_TYPE_LABEL[gig.gig_type]
    } · ${gig.description.slice(0, 130)}`,
  }
}

export default async function GigDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [gig, session] = await Promise.all([getGig(id), getSession()])
  if (!gig) notFound()

  const isOwner = session?.userId === gig.hirer_id
  const isAssignee = Boolean(session && gig.assigned_to === session.userId)

  // Fetches that only make sense for one side. RLS would return nothing to
  // anyone else anyway; skipping the round trip just saves time.
  const [applications, myApplication, disputes, alreadyReviewed] = await Promise.all([
    isOwner ? getGigApplications(gig.id) : Promise.resolve([]),
    session && !isOwner ? getMyApplicationFor(gig.id, session.userId) : Promise.resolve(null),
    isOwner || isAssignee ? getDisputesFor(gig.id) : Promise.resolve([]),
    session && gig.status === 'completed' && (isOwner || isAssignee)
      ? hasReviewed(gig.id, session.userId)
      : Promise.resolve(true),
  ])

  // Badge counts for everyone in the applicant list, fetched in one pass so the
  // hirer can weigh experience without opening each profile.
  const applicantStats: Record<string, ApplierStats> = Object.fromEntries(
    await Promise.all(
      applications.map(
        async (a) => [a.student_id, await getApplierStats(a.student_id)] as const,
      ),
    ),
  )

  // Fire-and-forget view counter. Owners viewing their own posting don't count.
  if (isSupabaseConfigured && !isOwner) {
    const supabase = await createClient()
    await supabase.rpc('increment_gig_views', { p_gig: gig.id })
  }

  const deadline = deadlineInfo(gig.deadline)
  const tier = rewardTier(gig.reward_amount)
  const hasPin = gig.lat !== null && gig.lng !== null
  const acceptedApplication =
    applications.find((a: (typeof applications)[number]) => a.status === 'accepted') ?? null

  // The dispute clock runs from the last status change, not from posting.
  const window = disputeWindow(gig.updated_at, DISPUTE_WINDOW_HOURS)
  const threadOpen = Boolean(gig.assigned_to) && (isOwner || isAssignee)

  // Where this applier sits in an urgent gig's first-come-first-served queue.
  const queuePosition =
    gig.is_urgent && myApplication?.status === 'pending'
      ? (gig.application_count ?? 1)
      : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/gigs"
        className="inline-flex items-center gap-1.5 text-[14px] text-dim transition-colors hover:text-cyan"
      >
        <IconArrowLeft className="size-3.5" />
        All gigs
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* ── Main column ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Panel className={`p-6 tier-${tier}`} glow>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={gig.status} />
              <Badge className="tier-ring">{GIG_TYPE_LABEL[gig.gig_type]}</Badge>
              {gig.is_urgent && (
                <Badge tone="rose" title="First-come-first-served: applicants are reviewed in the order they arrive">
                  <IconBolt className="size-3" />
                  Urgent
                </Badge>
              )}
              {gig.is_remote && (
                <Badge tone="teal">
                  <IconWifi className="size-3" />
                  Remote
                </Badge>
              )}
              {deadline && (
                <Badge tone={deadline.urgent || deadline.expired ? 'amber' : 'neutral'}>
                  <IconClock className="size-3" />
                  {deadline.label}
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-chalk sm:text-3xl">
              {gig.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <p className="text-[12px] uppercase tracking-wider text-dimmer">Reward</p>
                <p className="hud text-3xl font-semibold" style={{ color: 'var(--tier)' }}>
                  {formatRupees(gig.reward_amount)}
                </p>
              </div>
              {gig.estimated_hours && (
                <div>
                  <p className="text-[12px] uppercase tracking-wider text-dimmer">Effort</p>
                  <p className="hud text-lg text-chalk">~{gig.estimated_hours} h</p>
                </div>
              )}
              {gig.estimated_hours ? (
                <div>
                  <p className="text-[12px] uppercase tracking-wider text-dimmer">Implied rate</p>
                  <p className="hud text-lg text-mist">
                    ₹{Math.round(gig.reward_amount / Number(gig.estimated_hours))}/h
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[13.5px] text-dim">
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin className="size-3.5" />
                {gig.is_remote
                  ? 'Remote'
                  : (gig.location_label ?? 'Location shared after hiring')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconUsers className="size-3.5" />
                {gig.application_count ?? 0} applied
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconEye className="size-3.5" />
                {gig.views} views
              </span>
              <span className="ml-auto">Posted {relativeTime(gig.created_at)}</span>
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="text-base font-semibold text-chalk">The brief</h2>
            <div className="mt-3 whitespace-pre-line text-[15.5px] leading-relaxed text-mist">
              {gig.description}
            </div>

            {gig.skills.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="eyebrow">Skills wanted</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {gig.skills.map((skill) => (
                    <SkillChip key={skill.id} name={skill.name} href={`/gigs?skills=${skill.id}`} />
                  ))}
                </div>
              </div>
            )}

            {gig.deadline && (
              <p className="mt-5 text-[13.5px] text-dim">
                Wanted by <span className="text-chalk">{formatDate(gig.deadline)}</span>.
              </p>
            )}
          </Panel>

          {/* The thread, which replaced the old phone-number reveal entirely */}
          {threadOpen && (
            <Panel className="p-5">
              <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-chalk">
                <IconChat className="size-4 text-cyan" />
                Private thread open
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">
                {isOwner
                  ? 'You hired someone for this gig, so a thread is open between the two of you. No phone numbers, no email addresses — everything stays here, which also means an admin can read it if a dispute is raised.'
                  : 'You were hired for this gig. Talk to the hirer in your thread — no phone numbers or email addresses change hands.'}
              </p>
              <ButtonLink href={`/inbox/${gig.id}`} size="sm" className="mt-4">
                <IconChat className="size-3.5" />
                Open the thread
              </ButtonLink>
            </Panel>
          )}

          {/* Claim / status / applicants, by role */}
          {gig.status === 'open' && !isOwner && (
            <ClaimSection
              gigId={gig.id}
              reward={formatRupees(gig.reward_amount)}
              signedIn={Boolean(session)}
              isUrgent={gig.is_urgent}
              queuePosition={queuePosition}
              hasApplied={Boolean(myApplication && myApplication.status !== 'withdrawn')}
              applicationStatus={myApplication?.status ?? null}
            />
          )}

          {(isOwner || isAssignee) && (
            <StatusControls
              gigId={gig.id}
              status={gig.status}
              isOwner={isOwner}
              applicationId={myApplication?.id ?? null}
            />
          )}

          {/* The dispute window (item 8) — collapsed until someone needs it */}
          {(isOwner || isAssignee) && gig.status !== 'open' && (
            <DisputePanel
              gigId={gig.id}
              windowLabel={window.label}
              windowOpen={window.open}
              existing={disputes}
            />
          )}

          {isOwner && (
            <ApplicantList
              gigId={gig.id}
              status={gig.status}
              isUrgent={gig.is_urgent}
              applications={applications}
              stats={applicantStats}
            />
          )}

          {/* Reviews open once complete */}
          {gig.status === 'completed' && !alreadyReviewed && session && (
            <ReviewTarget
              gigId={gig.id}
              isOwner={isOwner}
              assigneeProfile={acceptedApplication?.student ?? null}
              hirerProfile={gig.hirer}
            />
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <Panel className="p-5">
            <p className="eyebrow">Posted by</p>
            <div className="mt-3 flex items-start gap-3">
              <Avatar
                name={gig.hirer?.full_name}
                src={gig.hirer?.avatar_url}
                size="lg"
              />
              <div className="min-w-0 space-y-1">
                <Link
                  href={gig.hirer ? `/profile/${gig.hirer.id}` : '#'}
                  className="block truncate text-[15.5px] font-semibold text-chalk hover:text-cyan"
                >
                  {gig.hirer?.full_name ?? 'Someone'}
                </Link>
                <StarRating
                  value={gig.hirer?.rating ?? 0}
                  count={gig.hirer?.rating_count ?? 0}
                  size="sm"
                />
                {gig.hirer?.id_verified_at && <VerifiedBadge label="Verified hirer" />}
                {gig.hirer?.department && (
                  <p className="truncate text-[12.5px] text-dim">{gig.hirer.department}</p>
                )}
              </div>
            </div>
            {gig.hirer && (
              <ButtonLink
                href={`/profile/${gig.hirer.id}`}
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
              >
                View profile & reviews
              </ButtonLink>
            )}
          </Panel>

          {hasPin && (
            <Panel className="overflow-hidden p-0">
              <div className="px-4 pt-4">
                <p className="eyebrow">Where</p>
                <p className="mt-1 text-[14px] text-chalk">
                  {gig.location_label ?? 'Pinned location'}
                </p>
              </div>
              <div className="mt-3 p-2">
                {/* No focusId: a popup would fill a 200px-tall map. */}
                <MapLoader gigs={[gig]} height="200px" />
              </div>
            </Panel>
          )}

          <Panel className="p-5">
            <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-chalk">
              <IconShield className="size-4 text-cyan" />
              How this stays safe
            </p>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-mist">
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                <span>
                  <span className="text-chalk">Nobody sees a phone number or an email</span> —
                  not the hirer, not the applier. A private thread opens the moment someone is
                  hired.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                <span>
                  Hirers can verify themselves with a government ID. Only the last four digits are
                  ever stored — <Link href="/about" className="text-cyan hover:underline">how that works</Link>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                <span>
                  Disputes stay open for {DISPUTE_WINDOW_HOURS} hours after the last status change.
                  Average resolution: <span className="text-chalk">{DISPUTE_SLA_LABEL}</span>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                Both sides review each other after completion, and ratings are permanent.
              </li>
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-relaxed text-dim">
              Free to post and free to apply. GigNest takes {PLATFORM_FEE_LABEL} on payout — ₹0 if
              you are a student with an approved fee waiver. Money changes hands directly, so agree
              the terms in writing before you start.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

/** Whichever counterparty the viewer is entitled to review. */
function ReviewTarget({
  gigId,
  isOwner,
  assigneeProfile,
  hirerProfile,
}: {
  gigId: string
  isOwner: boolean
  assigneeProfile: Parameters<typeof ReviewForm>[0]['reviewee'] | null
  hirerProfile: Parameters<typeof ReviewForm>[0]['reviewee'] | null
}) {
  const reviewee = isOwner ? assigneeProfile : hirerProfile
  if (!reviewee) return null

  return (
    <ReviewForm gigId={gigId} reviewee={reviewee} role={isOwner ? 'student' : 'hirer'} />
  )
}

/**
 * Anyone signed in and onboarded can apply — that is the whole marketplace, and
 * it is why this function no longer has a role branch. The institute email did
 * not disappear; it moved to the fee waiver on /verify, where it costs nobody a
 * job.
 */
function ClaimSection({
  gigId,
  reward,
  signedIn,
  isUrgent,
  queuePosition,
  hasApplied,
  applicationStatus,
}: {
  gigId: string
  reward: string
  signedIn: boolean
  isUrgent: boolean
  queuePosition: number | null
  hasApplied: boolean
  applicationStatus: string | null
}) {
  if (!signedIn) {
    return (
      <Panel className="p-5">
        <h2 className="text-base font-semibold text-chalk">Want this gig?</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-mist">
          Sign in to apply — <span className="text-chalk">any Google account works</span>. You do
          not have to be a student. Applying is free; if you are hired, GigNest takes{' '}
          {PLATFORM_FEE_LABEL} on payout, and students with an approved fee waiver pay ₹0.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={`/login?next=/gigs/${gigId}`}>Sign in to apply</ButtonLink>
          <ButtonLink href="/gigs" variant="ghost">
            Keep browsing
          </ButtonLink>
        </div>
      </Panel>
    )
  }

  if (hasApplied) {
    return (
      <Notice tone={applicationStatus === 'accepted' ? 'success' : 'info'} title="Application sent">
        {applicationStatus === 'accepted'
          ? 'You were hired. Your private thread with the hirer is open above.'
          : applicationStatus === 'rejected'
            ? 'The hirer went with someone else this time. Plenty more on the board.'
            : isUrgent && queuePosition
              ? `This gig is first-come-first-served. You are number ${queuePosition} in the queue — the hirer reviews applicants in the order they arrived, and you move up as they pass on the people ahead of you.`
              : 'Waiting on the hirer. If they hire you, a private thread opens here — no phone numbers or email addresses either way.'}
      </Notice>
    )
  }

  return <ApplyForm gigId={gigId} reward={reward} isUrgent={isUrgent} />
}
