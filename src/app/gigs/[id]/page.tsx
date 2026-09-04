import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { GIG_TYPE_LABEL, rewardTier } from '@/lib/constants'
import { deadlineInfo, formatDate, formatRupees, relativeTime } from '@/lib/format'
import {
  getMyApplicationFor,
  getGig,
  getGigApplications,
  getGigContact,
  hasReviewed,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { Badge, SkillChip, StatusPill } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Notice, Panel } from '@/components/ui/Panel'
import {
  IconArrowLeft,
  IconClock,
  IconEye,
  IconLock,
  IconMapPin,
  IconPhone,
  IconShield,
  IconUsers,
  IconWifi,
} from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'
import { MapLoader } from '@/components/MapLoader'
import { StarRating } from '@/components/StarRating'
import { ApplicantList } from './_components/ApplicantList'
import { ApplyForm } from './_components/ApplyForm'
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
  const role = session?.profile?.role

  // Fetches that only make sense for one side. RLS would return nothing to
  // anyone else anyway; skipping the round trip just saves time.
  const [applications, myApplication, contact, alreadyReviewed] = await Promise.all([
    isOwner ? getGigApplications(gig.id) : Promise.resolve([]),
    session && role === 'student' && !isOwner
      ? getMyApplicationFor(gig.id, session.userId)
      : Promise.resolve(null),
    isOwner || isAssignee ? getGigContact(gig.id) : Promise.resolve(null),
    session && gig.status === 'completed' && (isOwner || isAssignee)
      ? hasReviewed(gig.id, session.userId)
      : Promise.resolve(true),
  ])

  // Fire-and-forget view counter. Owners viewing their own posting don't count.
  if (isSupabaseConfigured && !isOwner) {
    const supabase = await createClient()
    await supabase.rpc('increment_gig_views', { p_gig: gig.id })
  }

  const deadline = deadlineInfo(gig.deadline)
  const tier = rewardTier(gig.reward_amount)
  const hasPin = gig.lat !== null && gig.lng !== null
  const acceptedApplication = applications.find((a) => a.status === 'accepted') ?? null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/gigs"
        className="inline-flex items-center gap-1.5 text-[13px] text-dim transition-colors hover:text-cyan"
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
                <p className="text-[11px] uppercase tracking-wider text-dimmer">Reward</p>
                <p className="hud text-3xl font-semibold" style={{ color: 'var(--tier)' }}>
                  {formatRupees(gig.reward_amount)}
                </p>
              </div>
              {gig.estimated_hours && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-dimmer">Effort</p>
                  <p className="hud text-lg text-chalk">~{gig.estimated_hours} h</p>
                </div>
              )}
              {gig.estimated_hours ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-dimmer">Implied rate</p>
                  <p className="hud text-lg text-mist">
                    ₹{Math.round(gig.reward_amount / Number(gig.estimated_hours))}/h
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[12.5px] text-dim">
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
            <div className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-mist">
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
              <p className="mt-5 text-[12.5px] text-dim">
                Wanted by <span className="text-chalk">{formatDate(gig.deadline)}</span>.
              </p>
            )}
          </Panel>

          {/* Contact reveal — the payoff of the two-table design */}
          {(isOwner || isAssignee) && (
            <ContactPanel
              phone={contact?.phone ?? null}
              alt={contact?.alt_contact ?? null}
              counterpartyPhone={
                isOwner ? (acceptedApplication?.phone ?? null) : null
              }
              isOwner={isOwner}
            />
          )}

          {/* Claim / status / applicants, by role */}
          {gig.status === 'open' && !isOwner && (
            <ClaimSection
              gigId={gig.id}
              reward={formatRupees(gig.reward_amount)}
              signedIn={Boolean(session)}
              role={role}
              isStudentEligible={Boolean(session?.isStudentEligible)}
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

          {isOwner && (
            <ApplicantList
              gigId={gig.id}
              status={gig.status}
              applications={applications}
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
                  className="block truncate text-[14.5px] font-semibold text-chalk hover:text-cyan"
                >
                  {gig.hirer?.full_name ?? 'Someone'}
                </Link>
                <StarRating
                  value={gig.hirer?.rating ?? 0}
                  count={gig.hirer?.rating_count ?? 0}
                  size="sm"
                />
                {gig.hirer?.department && (
                  <p className="truncate text-[11.5px] text-dim">{gig.hirer.department}</p>
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
                <p className="mt-1 text-[13px] text-chalk">
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
            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-chalk">
              <IconShield className="size-4 text-cyan" />
              How this stays safe
            </p>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-mist">
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                Only <span className="text-chalk">@itbhu.ac.in</span> accounts, verified through
                Google, can apply. The database refuses anything else.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                Phone numbers are hidden from both sides until the hirer accepts an applicant.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan" />
                Both sides review each other after completion, and ratings are permanent.
              </li>
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-dim">
              Money changes hands directly — GigNest does not hold payments. Agree the terms in
              writing before you start.
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

function ContactPanel({
  phone,
  alt,
  counterpartyPhone,
  isOwner,
}: {
  phone: string | null
  alt: string | null
  counterpartyPhone: string | null
  isOwner: boolean
}) {
  const shown = isOwner ? counterpartyPhone : phone

  if (!shown && !alt) {
    return (
      <Notice tone="info" title="Contact details unlock on hiring">
        {isOwner
          ? "Accept an applicant and their phone number appears here — and yours appears for them. Neither side can see the other's until then."
          : 'Your hirer’s number will appear here once your application is accepted.'}
      </Notice>
    )
  }

  return (
    <Panel className="p-5">
      <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-lime">
        <IconLock className="size-3.5" />
        Contact unlocked
      </p>
      <p className="mt-1 text-[12.5px] text-mist">
        {isOwner
          ? 'You hired someone, so you can both reach each other now.'
          : 'You were accepted for this gig.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown && (
          <a
            href={`tel:${shown.replace(/\s/g, '')}`}
            className="hud inline-flex items-center gap-2 rounded-lg border border-lime/30 bg-lime/[0.08] px-3 py-2 text-[14px] text-lime transition-colors hover:bg-lime/15"
          >
            <IconPhone className="size-4" />
            {shown}
          </a>
        )}
        {alt && (
          <span className="inline-flex items-center rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[13px] text-mist">
            {alt}
          </span>
        )}
      </div>
    </Panel>
  )
}

/**
 * Everything that is *not* "signed-in eligible student on an open gig" gets a
 * plain explanation instead of a form. Being explicit about why you cannot
 * apply is the whole pitch of the exclusivity model.
 */
function ClaimSection({
  gigId,
  reward,
  signedIn,
  role,
  isStudentEligible,
  hasApplied,
  applicationStatus,
}: {
  gigId: string
  reward: string
  signedIn: boolean
  role?: string
  isStudentEligible: boolean
  hasApplied: boolean
  applicationStatus: string | null
}) {
  if (!signedIn) {
    return (
      <Panel className="p-5">
        <h2 className="text-base font-semibold text-chalk">Want this gig?</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">
          Sign in with your <span className="hud text-cyan">@itbhu.ac.in</span> Google account to
          apply. That address is what proves you are an IIT BHU student — it is the only way in.
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
          ? 'You were accepted. Contact details are unlocked above.'
          : applicationStatus === 'rejected'
            ? 'The hirer went with someone else this time. Plenty more on the board.'
            : 'Waiting on the hirer. You will see their number here the moment they accept.'}
      </Notice>
    )
  }

  if (role !== 'student') {
    return (
      <Panel className="p-5">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-chalk">
          <IconLock className="size-4 text-amber" />
          Students only
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">
          {isStudentEligible
            ? 'Your email qualifies, but your account is set up to post work. Switch your role in onboarding to start claiming gigs.'
            : 'Claiming gigs is exclusive to verified IIT (BHU) Varanasi students — an @itbhu.ac.in Google account. You can post as much work as you like with this account.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {isStudentEligible ? (
            <ButtonLink href="/onboarding" size="sm">
              Switch to a student account
            </ButtonLink>
          ) : (
            <ButtonLink href="/gigs/new" variant="secondary" size="sm">
              Post a gig instead
            </ButtonLink>
          )}
        </div>
      </Panel>
    )
  }

  return <ApplyForm gigId={gigId} reward={reward} />
}
