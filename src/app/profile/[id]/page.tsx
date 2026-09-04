import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_LABEL } from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import {
  getProfileBio,
  getProfileSkills,
  getPublicProfile,
  getQuestsPostedBy,
  getReviewsFor,
} from '@/lib/queries'
import { Avatar } from '@/components/Avatar'
import { StarRating } from '@/components/StarRating'
import { Badge, SkillChip, StatusPill } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { IconBriefcase, IconShield, IconSparkles, IconStar } from '@/components/ui/Icons'
import type { Review } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const profile = await getPublicProfile(id)
  if (!profile) return { title: 'Profile not found' }

  return {
    title: profile.full_name ?? 'Profile',
    description: `${ROLE_LABEL[profile.role]} on GigNest${
      profile.department ? ` · ${profile.department}` : ''
    }.`,
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [profile, session] = await Promise.all([getPublicProfile(id), getSession()])
  if (!profile) notFound()

  const isSelf = session?.userId === profile.id
  const isStudent = profile.role === 'student'

  const [bio, skills, reviews, posted] = await Promise.all([
    getProfileBio(id),
    getProfileSkills(id),
    getReviewsFor(id),
    getQuestsPostedBy(id),
  ])

  // Only live postings belong on a stranger's profile — draft-ish states are noise.
  const publicQuests = posted.filter((q) => q.status === 'open' || q.status === 'assigned')

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <Panel className="p-6" glow>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isStudent ? 'cyan' : 'violet'}>
                  {isStudent ? (
                    <>
                      <IconShield className="size-3" />
                      Verified student
                    </>
                  ) : (
                    ROLE_LABEL[profile.role]
                  )}
                </Badge>
                {isSelf && <Badge tone="neutral">This is you</Badge>}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">
                {profile.full_name ?? 'Anonymous'}
              </h1>
              <StarRating value={profile.rating} count={profile.rating_count} />
              {(profile.department || profile.year) && (
                <p className="text-[13px] text-mist">
                  {profile.department}
                  {profile.department && profile.year ? ' · ' : ''}
                  {profile.year ? `Year ${profile.year}` : ''}
                </p>
              )}
            </div>
          </div>

          {isSelf ? (
            <ButtonLink href="/profile/edit" variant="secondary" size="sm">
              Edit profile
            </ButtonLink>
          ) : (
            isStudent && (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-dimmer">Quests reviewed</p>
                <p className="hud text-2xl font-semibold text-lime">{profile.rating_count}</p>
              </div>
            )
          )}
        </div>

        {bio && (
          <p className="mt-6 max-w-2xl whitespace-pre-line border-t border-line pt-5 text-[14px] leading-relaxed text-mist">
            {bio}
          </p>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* ── Reviews ────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-chalk">
              <IconStar className="size-4 text-amber" />
              Reviews
              {reviews.length > 0 && (
                <span className="hud text-[12px] font-normal text-dim">{reviews.length}</span>
              )}
            </h2>

            {reviews.length === 0 ? (
              <EmptyState
                icon={<IconStar className="size-5" />}
                title="No reviews yet"
                blurb={
                  isSelf
                    ? 'Finish a quest and your counterparty can review you. Ratings are permanent, so they are worth earning.'
                    : 'Nobody has reviewed this account yet. That means new, not bad — but agree the terms in writing.'
                }
              />
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>

          {/* ── Their open postings ──────────────────────────────────────── */}
          {publicQuests.length > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-chalk">
                <IconBriefcase className="size-4 text-cyan" />
                Currently hiring
              </h2>
              <Panel className="divide-y divide-line/70 p-0">
                {publicQuests.map((quest) => (
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
                        {quest.is_remote ? 'Remote' : (quest.location_label ?? 'On site')}
                      </span>
                      <span className="text-dimmer">{relativeTime(quest.created_at)}</span>
                    </p>
                  </Link>
                ))}
              </Panel>
            </section>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          <Panel className="p-5">
            <p className="eyebrow">Rating</p>
            {profile.rating_count === 0 ? (
              <p className="mt-2 text-[13px] text-dim">No ratings yet.</p>
            ) : (
              <>
                <p className="mt-1.5 flex items-baseline gap-2">
                  <span className="hud text-3xl font-semibold text-amber">
                    {profile.rating.toFixed(1)}
                  </span>
                  <span className="text-[12.5px] text-dim">
                    from {profile.rating_count}{' '}
                    {profile.rating_count === 1 ? 'review' : 'reviews'}
                  </span>
                </p>
                <div className="mt-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const n = reviews.filter((r) => r.rating === star).length
                    const pct = reviews.length ? (n / reviews.length) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="hud w-3 text-[11px] text-dim">{star}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-amber/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="hud w-4 text-right text-[11px] text-dimmer">{n}</span>
                      </div>
                    )
                  })}
                </div>
                {reviews.length < profile.rating_count && (
                  <p className="mt-3 text-[11px] text-dimmer">
                    Distribution covers the {reviews.length} most recent.
                  </p>
                )}
              </>
            )}
          </Panel>

          {skills.length > 0 && (
            <Panel className="p-5">
              <p className="eyebrow">
                {isStudent ? 'Skills' : 'Hires for'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <SkillChip key={skill.id} name={skill.name} href={`/quests?skills=${skill.id}`} />
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
                Tap a tag to see open quests wanting it.
              </p>
            </Panel>
          )}

          {isStudent && !isSelf && (
            <Panel className="p-5">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-chalk">
                <IconSparkles className="size-4 text-cyan" />
                Want to hire them?
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist">
                There is no direct-message inbox yet. Post a quest with the tags they carry — it
                lands on their board immediately.
              </p>
              <ButtonLink href="/quests/new" size="sm" className="mt-4 w-full">
                Post a quest
              </ButtonLink>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3">
        <Avatar name={review.reviewer?.full_name} src={review.reviewer?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {review.reviewer ? (
                <Link
                  href={`/profile/${review.reviewer.id}`}
                  className="text-[13.5px] font-medium text-chalk hover:text-cyan"
                >
                  {review.reviewer.full_name ?? 'Someone'}
                </Link>
              ) : (
                <span className="text-[13.5px] font-medium text-chalk">Someone</span>
              )}
              {review.reviewer && (
                <Badge tone="neutral">{ROLE_LABEL[review.reviewer.role]}</Badge>
              )}
            </div>
            <span className="text-[11.5px] text-dimmer">{relativeTime(review.created_at)}</span>
          </div>

          <div className="mt-1.5">
            <StarRating value={review.rating} size="sm" />
          </div>

          {review.comment && (
            <p className="mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed text-mist">
              {review.comment}
            </p>
          )}

          <Link
            href={`/quests/${review.quest_id}`}
            className="mt-2.5 inline-block text-[11.5px] text-dim transition-colors hover:text-cyan"
          >
            View the quest →
          </Link>
        </div>
      </div>
    </Panel>
  )
}
