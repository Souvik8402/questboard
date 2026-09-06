import type { Metadata } from 'next'
import Link from 'next/link'
import { demoSession, requireProfile } from '@/lib/auth'
import { earnedBadge, hasLoyaltyBadge, nextBadge } from '@/lib/badges'
import { isSupabaseConfigured, siteUrl } from '@/lib/config'
import { GIG_STATUS_LABEL, ROLE_LABEL } from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import {
  getApplierStats,
  getMyApplications,
  getProfileSkills,
  getGigs,
  getGigsAssignedTo,
  getGigsPostedBy,
  getReferralCount,
  getSuggestedAppliers,
} from '@/lib/queries'
import { AchievementBadge, ApplicationPill, Badge, LoyaltyBadge, StatusPill } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { IconAward, IconBriefcase, IconLayers, IconPlus, IconSearch, IconSparkles } from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'
import { GigCard, GigRow } from '@/components/GigCard'
import { ReferralPanel } from '@/components/ReferralPanel'
import { SuggestedAppliers } from '@/components/SuggestedAppliers'
import { StarRating } from '@/components/StarRating'
import type { GigStatus, GigWithRelations } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your gigs, applications and profile.',
}

export default async function DashboardPage() {
  // Demo mode has no real session, so it borrows a sample student rather than
  // bouncing the one visitor who has not set up Supabase yet.
  const { userId, profile, isStudentEligible } = isSupabaseConfigured
    ? await requireProfile('/dashboard')
    : demoSession()
  const isStudent = profile.role === 'student'

  const [posted, assigned, applications, mySkills, stats, suggestions, referrals] = await Promise.all([
    getGigsPostedBy(userId),
    isStudent ? getGigsAssignedTo(userId) : Promise.resolve([]),
    isStudent ? getMyApplications(userId) : Promise.resolve([]),
    isStudent ? getProfileSkills(userId) : Promise.resolve([]),
    // Item 6's inputs. A hirer who delivers work has earned badges for it too,
    // so this is not gated on role — only the suggestions below are.
    getApplierStats(userId),
    // Item 7: matches against *your own postings*, so it is a hirer's block.
    isStudent ? Promise.resolve([]) : getSuggestedAppliers(userId),
    // Item 9: how many people joined via this account's share link.
    getReferralCount(userId),
  ])

  const tier = earnedBadge(stats)
  const next = nextBadge(stats)
  const referralCode = profile.referral_code ?? null
  const referralShareUrl = referralCode
    ? `${siteUrl()}/login?ref=${encodeURIComponent(referralCode)}`
    : `${siteUrl()}/login`

  // Gigs matching the student's own tags, minus anything they already touched.
  const recommended = isStudent && mySkills.length
    ? await getGigs({ skills: mySkills.map((s) => s.id), sort: 'recent' }).then(({ gigs }) => {
        const seen = new Set([
          ...applications.map((a) => a.gig_id),
          ...assigned.map((q) => q.id),
        ])
        return gigs.filter((q) => q.hirer_id !== userId && !seen.has(q.id)).slice(0, 6)
      })
    : []

  const live = applications.filter((a) => a.status === 'pending')
  const won = applications.filter((a) => a.status === 'accepted')
  const openPosted = posted.filter((q) => q.status === 'open')
  const earned = assigned
    .filter((q) => q.status === 'completed')
    .reduce((sum, q) => sum + q.reward_amount, 0)
  const committed = openPosted.reduce((sum, q) => sum + q.reward_amount, 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" />
          <div className="space-y-1.5">
            <p className="eyebrow">{ROLE_LABEL[profile.role]} dashboard</p>
            <h1 className="text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">
              {profile.full_name ?? 'Welcome'}
            </h1>
            <StarRating value={profile.rating} count={profile.rating_count} size="sm" />
            {isStudent && profile.department && (
              <p className="text-[13.5px] text-dim">
                {profile.department}
                {profile.year ? ` · Year ${profile.year}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/gigs/new" size="sm">
            <IconPlus className="size-4" />
            Post a gig
          </ButtonLink>
          <ButtonLink href="/profile/edit" variant="secondary" size="sm">
            Edit profile
          </ButtonLink>
          <ButtonLink href={`/profile/${userId}`} variant="ghost" size="sm">
            View public profile
          </ButtonLink>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="mt-6">
          <Notice tone="warn" title="Demo mode — sample account">
            You are looking at a seeded student, {profile.full_name}, because there is no
            database attached. Everything below is real UI over fake rows; nothing can be saved.
          </Notice>
        </div>
      )}

      {/* ── Counters ─────────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isStudent ? (
          <>
            <Metric label="Live applications" value={live.length} accent="cyan" />
            <Metric label="Gigs won" value={won.length} accent="lime" />
            <Metric
              label="In progress"
              value={assigned.filter((q) => q.status !== 'completed' && q.status !== 'cancelled').length}
              accent="violet"
            />
            <Metric label="Earned" value={formatRupees(earned)} accent="amber" mono />
          </>
        ) : (
          <>
            <Metric label="Open gigs" value={openPosted.length} accent="lime" />
            <Metric label="Total posted" value={posted.length} accent="cyan" />
            <Metric
              label="Applicants waiting"
              value={openPosted.reduce((n, q) => n + (q.application_count ?? 0), 0)}
              accent="violet"
            />
            <Metric label="Reward committed" value={formatRupees(committed)} accent="amber" mono />
          </>
        )}
      </div>

      {/* ── Student-eligible nudge ───────────────────────────────────────── */}
      {!isStudent && isStudentEligible && (
        <Panel className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[14.5px] font-medium text-chalk">
              Your email qualifies you to claim gigs too
            </p>
            <p className="mt-0.5 text-[13.5px] text-mist">
              You are set up as a hirer. Switch to a student account and you can apply for work as
              well as post it.
            </p>
          </div>
          <ButtonLink href="/onboarding" variant="secondary" size="sm">
            Switch role
          </ButtonLink>
        </Panel>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* ── Left: what you're doing ────────────────────────────────────── */}
        {/* min-w-0: without it the grid column inflates to the widest gig
            title instead of letting `truncate` do its job on narrow screens. */}
        <section className="min-w-0 space-y-4">
          <SectionTitle
            icon={<IconBriefcase className="size-4" />}
            title={isStudent ? 'Work you are doing' : 'Gigs you posted'}
            action={
              isStudent ? undefined : (
                <Link href="/gigs/new" className="text-[13.5px] text-cyan hover:underline">
                  Post another
                </Link>
              )
            }
          />

          {isStudent ? (
            assigned.length === 0 ? (
              <EmptyState
                icon={<IconSearch className="size-5" />}
                title="Nothing assigned yet"
                blurb="Apply to a few gigs that match your tags. Hirers reply fastest to pitches that name a specific thing you have already done."
                action={
                  <ButtonLink href="/gigs" size="sm">
                    Browse the board
                  </ButtonLink>
                }
              />
            ) : (
              <GigList gigs={assigned} />
            )
          ) : posted.length === 0 ? (
            <EmptyState
              icon={<IconPlus className="size-5" />}
              title="You have not posted anything yet"
              blurb="Describe the work, name a reward, pick a few skill tags. Most gigs get their first applicant within a day."
              action={
                <ButtonLink href="/gigs/new" size="sm">
                  Post your first gig
                </ButtonLink>
              }
            />
          ) : (
            <PostedList gigs={posted} />
          )}

          {/* Hirers who are also students see both lists. */}
          {isStudent && posted.length > 0 && (
            <>
              <SectionTitle
                icon={<IconPlus className="size-4" />}
                title="Gigs you posted"
              />
              <PostedList gigs={posted} />
            </>
          )}
        </section>

        {/* ── Right: applications / matches ──────────────────────────────── */}
        <section className="min-w-0 space-y-4">
          {/* Item 9 — goes to both roles. The link works for a student (who refers
              other students through their group chat) or a hirer (who refers a
              neighbour). The badge appears once anyone joins. */}
          <ReferralPanel
            code={referralCode}
            referralCount={referrals}
            shareUrl={referralShareUrl}
            showBadgeOnProfile
          />

          {isStudent ? (
            <>
              {/* Item 6's dashboard payoff: the tier you hold and the distance
                  to the next one. Reads the same earned/next math as /profile. */}
              {(tier || next) && (
                <Panel className="p-5">
                  <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-chalk">
                    <IconAward className="size-4 text-amber" />
                    Badges
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {tier ? (
                      <AchievementBadge tier={tier} />
                    ) : (
                      <span className="text-[13px] text-dim">None yet.</span>
                    )}
                    {hasLoyaltyBadge(stats) && <LoyaltyBadge />}
                    <span className="ml-auto hud text-[12px] text-dimmer">
                      {stats.completed} delivered
                    </span>
                  </div>
                  {next && (
                    <>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full bg-amber/70"
                          style={{
                            width: `${Math.min(100, (stats.completed / next.target) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
                        {next.remaining} more {next.remaining === 1 ? 'gig' : 'gigs'} to{' '}
                        {next.label} — {stats.completed} of {next.target} delivered.
                        {stats.mentorships > 0 &&
                          ` · ${stats.mentorships} paid mentorship${stats.mentorships === 1 ? '' : 's'} bought.`}
                      </p>
                    </>
                  )}
                </Panel>
              )}

              <SectionTitle
                icon={<IconLayers className="size-4" />}
                title="Your applications"
                action={
                  <span className="hud text-[12.5px] text-dim">{applications.length} total</span>
                }
              />
              {applications.length === 0 ? (
                <EmptyState title="No applications yet" blurb="They will show up here with their status the moment you apply." />
              ) : (
                <Panel className="divide-y divide-line/70 p-0">
                  {applications.map((application) => (
                    <div key={application.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/gigs/${application.gig_id}`}
                          className="line-clamp-2 text-[14.5px] font-medium leading-snug text-chalk hover:text-cyan"
                        >
                          {application.gig?.title ?? 'Gig'}
                        </Link>
                        <ApplicationPill status={application.status} />
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-dim">
                        {application.gig && (
                          <span className="hud text-mist">
                            {formatRupees(application.gig.reward_amount)}
                          </span>
                        )}
                        <span>Applied {relativeTime(application.created_at)}</span>
                        {application.gig && (
                          <span className="text-dimmer">
                            Gig is {GIG_STATUS_LABEL[application.gig.status].toLowerCase()}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </Panel>
              )}

              {recommended.length > 0 && (
                <>
                  <SectionTitle
                    icon={<IconSparkles className="size-4" />}
                    title="Matched to your tags"
                    action={
                      <Link
                        href={`/gigs?skills=${mySkills.map((s) => s.id).join(',')}`}
                        className="text-[13.5px] text-cyan hover:underline"
                      >
                        See all
                      </Link>
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recommended.slice(0, 4).map((gig, i) => (
                      <GigCard key={gig.id} gig={gig} index={i} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Item 7 — the shortest path to someone who can do what you post.
                  Above the generic tips on purpose: it is about real people, and
                  it changes with every gig you post. */}
              {suggestions.length > 0 && (
                <SuggestedAppliers suggestions={suggestions} own className="mb-1" />
              )}

              <SectionTitle
                icon={<IconSparkles className="size-4" />}
                title="Getting good applicants"
              />
              <Panel className="space-y-3.5 p-5 text-[14px] leading-relaxed text-mist">
                <Tip n={1} title="Name a real number">
                  Gigs with a reward under ₹500 rarely get replies. Students compare your posting
                  against tuition work, which pays well.
                </Tip>
                <Tip n={2} title="Tag precisely">
                  Three accurate tags beat eight hopeful ones — the board filters on them, so wrong
                  tags bring wrong people.
                </Tip>
                <Tip n={3} title="Say what done looks like">
                  &ldquo;Deployed and live on our domain&rdquo; is a brief. &ldquo;Make us a
                  website&rdquo; is a wish.
                </Tip>
                <Tip n={4} title="Reply within a day">
                  Hiring someone opens a private thread with them in your inbox. Until then neither
                  side can contact the other at all, so silence stalls everything.
                </Tip>
              </Panel>

              {openPosted.length > 0 && (
                <Panel className="p-5">
                  <p className="text-[14px] font-semibold text-chalk">Waiting on you</p>
                  <ul className="mt-3 space-y-2">
                    {openPosted
                      .filter((q) => (q.application_count ?? 0) > 0)
                      .map((q) => (
                        <li key={q.id}>
                          <Link
                            href={`/gigs/${q.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-black/[0.02] px-3 py-2.5 transition-colors hover:border-cyan/35"
                          >
                            <span className="truncate text-[14px] text-chalk">{q.title}</span>
                            <Badge tone="amber">
                              {q.application_count} to review
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    {openPosted.every((q) => (q.application_count ?? 0) === 0) && (
                      <li className="text-[13.5px] text-dim">
                        No applicants yet on your open gigs.
                      </li>
                    )}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
  mono,
}: {
  label: string
  value: string | number
  accent: 'cyan' | 'violet' | 'lime' | 'amber'
  mono?: boolean
}) {
  const colour = { cyan: 'text-cyan', violet: 'text-violet', lime: 'text-lime', amber: 'text-amber' }[
    accent
  ]
  return (
    <div className="glass p-4">
      <p className={`hud font-semibold ${colour} ${mono ? 'text-xl' : 'text-2xl'}`}>{value}</p>
      <p className="mt-1 text-[13.5px] text-mist">{label}</p>
    </div>
  )
}

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon?: React.ReactNode
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-chalk">
        {icon && <span className="text-cyan">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  )
}

function GigList({ gigs }: { gigs: GigWithRelations[] }) {
  return (
    <Panel className="divide-y divide-line/70 p-0">
      {gigs.map((gig) => (
        <GigRow key={gig.id} gig={gig} />
      ))}
    </Panel>
  )
}

/** Owner's view of their own postings — status first, applicant count loud. */
function PostedList({ gigs }: { gigs: GigWithRelations[] }) {
  const order: GigStatus[] = ['open', 'assigned', 'in_progress', 'completed', 'cancelled']
  const sorted = [...gigs].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  )

  return (
    <Panel className="divide-y divide-line/70 p-0">
      {sorted.map((gig) => (
        <Link
          key={gig.id}
          href={`/gigs/${gig.id}`}
          className="block p-4 transition-colors hover:bg-black/[0.035]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-[14.5px] font-medium leading-snug text-chalk">
              {gig.title}
            </p>
            <StatusPill status={gig.status} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-dim">
            <span className="hud text-mist">{formatRupees(gig.reward_amount)}</span>
            <span>
              {gig.application_count ?? 0}{' '}
              {(gig.application_count ?? 0) === 1 ? 'applicant' : 'applicants'}
            </span>
            <span>{gig.views} views</span>
            <span className="text-dimmer">{relativeTime(gig.created_at)}</span>
          </p>
        </Link>
      ))}
    </Panel>
  )
}

function Tip({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="hud mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-cyan/25 bg-cyan/10 text-[11.5px] text-cyan">
        {n}
      </span>
      <p>
        <span className="font-medium text-chalk">{title}.</span> {children}
      </p>
    </div>
  )
}
