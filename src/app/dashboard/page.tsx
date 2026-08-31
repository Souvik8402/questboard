import type { Metadata } from 'next'
import Link from 'next/link'
import { demoSession, requireProfile } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { QUEST_STATUS_LABEL, ROLE_LABEL } from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import {
  getMyApplications,
  getProfileSkills,
  getQuests,
  getQuestsAssignedTo,
  getQuestsPostedBy,
} from '@/lib/queries'
import { ApplicationPill, Badge, StatusPill } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { IconBriefcase, IconLayers, IconPlus, IconSearch, IconSparkles } from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'
import { QuestCard, QuestRow } from '@/components/QuestCard'
import { StarRating } from '@/components/StarRating'
import type { QuestStatus, QuestWithRelations } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your quests, applications and profile.',
}

export default async function DashboardPage() {
  // Demo mode has no real session, so it borrows a sample student rather than
  // bouncing the one visitor who has not set up Supabase yet.
  const { userId, profile, isStudentEligible } = isSupabaseConfigured
    ? await requireProfile('/dashboard')
    : demoSession()
  const isStudent = profile.role === 'student'

  const [posted, assigned, applications, mySkills] = await Promise.all([
    getQuestsPostedBy(userId),
    isStudent ? getQuestsAssignedTo(userId) : Promise.resolve([]),
    isStudent ? getMyApplications(userId) : Promise.resolve([]),
    isStudent ? getProfileSkills(userId) : Promise.resolve([]),
  ])

  // Quests matching the student's own tags, minus anything they already touched.
  const recommended = isStudent && mySkills.length
    ? await getQuests({ skills: mySkills.map((s) => s.id), sort: 'recent' }).then(({ quests }) => {
        const seen = new Set([
          ...applications.map((a) => a.quest_id),
          ...assigned.map((q) => q.id),
        ])
        return quests.filter((q) => q.hirer_id !== userId && !seen.has(q.id)).slice(0, 6)
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
              <p className="text-[12.5px] text-dim">
                {profile.department}
                {profile.year ? ` · Year ${profile.year}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/quests/new" size="sm">
            <IconPlus className="size-4" />
            Post a quest
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
            <Metric label="Quests won" value={won.length} accent="lime" />
            <Metric
              label="In progress"
              value={assigned.filter((q) => q.status !== 'completed' && q.status !== 'cancelled').length}
              accent="violet"
            />
            <Metric label="Earned" value={formatRupees(earned)} accent="amber" mono />
          </>
        ) : (
          <>
            <Metric label="Open quests" value={openPosted.length} accent="lime" />
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
            <p className="text-[13.5px] font-medium text-chalk">
              Your email qualifies you to claim quests too
            </p>
            <p className="mt-0.5 text-[12.5px] text-mist">
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
        {/* min-w-0: without it the grid column inflates to the widest quest
            title instead of letting `truncate` do its job on narrow screens. */}
        <section className="min-w-0 space-y-4">
          <SectionTitle
            icon={<IconBriefcase className="size-4" />}
            title={isStudent ? 'Work you are doing' : 'Quests you posted'}
            action={
              isStudent ? undefined : (
                <Link href="/quests/new" className="text-[12.5px] text-cyan hover:underline">
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
                blurb="Apply to a few quests that match your tags. Hirers reply fastest to pitches that name a specific thing you have already done."
                action={
                  <ButtonLink href="/quests" size="sm">
                    Browse the board
                  </ButtonLink>
                }
              />
            ) : (
              <QuestList quests={assigned} />
            )
          ) : posted.length === 0 ? (
            <EmptyState
              icon={<IconPlus className="size-5" />}
              title="You have not posted anything yet"
              blurb="Describe the work, name a reward, pick a few skill tags. Most quests get their first applicant within a day."
              action={
                <ButtonLink href="/quests/new" size="sm">
                  Post your first quest
                </ButtonLink>
              }
            />
          ) : (
            <PostedList quests={posted} />
          )}

          {/* Hirers who are also students see both lists. */}
          {isStudent && posted.length > 0 && (
            <>
              <SectionTitle
                icon={<IconPlus className="size-4" />}
                title="Quests you posted"
              />
              <PostedList quests={posted} />
            </>
          )}
        </section>

        {/* ── Right: applications / matches ──────────────────────────────── */}
        <section className="min-w-0 space-y-4">
          {isStudent ? (
            <>
              <SectionTitle
                icon={<IconLayers className="size-4" />}
                title="Your applications"
                action={
                  <span className="hud text-[11.5px] text-dim">{applications.length} total</span>
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
                          href={`/quests/${application.quest_id}`}
                          className="line-clamp-2 text-[13.5px] font-medium leading-snug text-chalk hover:text-cyan"
                        >
                          {application.quest?.title ?? 'Quest'}
                        </Link>
                        <ApplicationPill status={application.status} />
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-dim">
                        {application.quest && (
                          <span className="hud text-mist">
                            {formatRupees(application.quest.reward_amount)}
                          </span>
                        )}
                        <span>Applied {relativeTime(application.created_at)}</span>
                        {application.quest && (
                          <span className="text-dimmer">
                            Quest is {QUEST_STATUS_LABEL[application.quest.status].toLowerCase()}
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
                        href={`/quests?skills=${mySkills.map((s) => s.id).join(',')}`}
                        className="text-[12.5px] text-cyan hover:underline"
                      >
                        See all
                      </Link>
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recommended.slice(0, 4).map((quest, i) => (
                      <QuestCard key={quest.id} quest={quest} index={i} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <SectionTitle
                icon={<IconSparkles className="size-4" />}
                title="Getting good applicants"
              />
              <Panel className="space-y-3.5 p-5 text-[13px] leading-relaxed text-mist">
                <Tip n={1} title="Name a real number">
                  Quests with a reward under ₹500 rarely get replies. Students compare your posting
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
                  Accepting an applicant unlocks both phone numbers at once. Until then neither side
                  can contact the other, so silence stalls everything.
                </Tip>
              </Panel>

              {openPosted.length > 0 && (
                <Panel className="p-5">
                  <p className="text-[13px] font-semibold text-chalk">Waiting on you</p>
                  <ul className="mt-3 space-y-2">
                    {openPosted
                      .filter((q) => (q.application_count ?? 0) > 0)
                      .map((q) => (
                        <li key={q.id}>
                          <Link
                            href={`/quests/${q.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-cyan/35"
                          >
                            <span className="truncate text-[13px] text-chalk">{q.title}</span>
                            <Badge tone="amber">
                              {q.application_count} to review
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    {openPosted.every((q) => (q.application_count ?? 0) === 0) && (
                      <li className="text-[12.5px] text-dim">
                        No applicants yet on your open quests.
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
      <p className="mt-1 text-[12.5px] text-mist">{label}</p>
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

function QuestList({ quests }: { quests: QuestWithRelations[] }) {
  return (
    <Panel className="divide-y divide-line/70 p-0">
      {quests.map((quest) => (
        <QuestRow key={quest.id} quest={quest} />
      ))}
    </Panel>
  )
}

/** Owner's view of their own postings — status first, applicant count loud. */
function PostedList({ quests }: { quests: QuestWithRelations[] }) {
  const order: QuestStatus[] = ['open', 'assigned', 'in_progress', 'completed', 'cancelled']
  const sorted = [...quests].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  )

  return (
    <Panel className="divide-y divide-line/70 p-0">
      {sorted.map((quest) => (
        <Link
          key={quest.id}
          href={`/quests/${quest.id}`}
          className="block p-4 transition-colors hover:bg-white/[0.035]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-chalk">
              {quest.title}
            </p>
            <StatusPill status={quest.status} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-dim">
            <span className="hud text-mist">{formatRupees(quest.reward_amount)}</span>
            <span>
              {quest.application_count ?? 0}{' '}
              {(quest.application_count ?? 0) === 1 ? 'applicant' : 'applicants'}
            </span>
            <span>{quest.views} views</span>
            <span className="text-dimmer">{relativeTime(quest.created_at)}</span>
          </p>
        </Link>
      ))}
    </Panel>
  )
}

function Tip({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="hud mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-cyan/25 bg-cyan/10 text-[10.5px] text-cyan">
        {n}
      </span>
      <p>
        <span className="font-medium text-chalk">{title}.</span> {children}
      </p>
    </div>
  )
}
