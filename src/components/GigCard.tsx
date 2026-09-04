import Link from 'next/link'
import { cn } from '@/lib/cn'
import { GIG_TYPE_LABEL, rewardTier } from '@/lib/constants'
import { deadlineInfo, formatRupees, pluralize, relativeTime } from '@/lib/format'
import type { GigWithRelations } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { SkillChip, StatusPill } from '@/components/ui/Badge'
import { IconClock, IconMapPin, IconUsers, IconWifi } from '@/components/ui/Icons'

/**
 * A gig, styled as an entry on a job board: reward first (it's what everyone
 * scans for), then the ask, then the tags that make it findable.
 */
export function GigCard({
  gig,
  index = 0,
  compact = false,
}: {
  gig: GigWithRelations
  index?: number
  compact?: boolean
}) {
  const tier = rewardTier(gig.reward_amount)
  const deadline = deadlineInfo(gig.deadline)
  const applicants = gig.application_count ?? 0
  const skills = gig.skills.slice(0, compact ? 2 : 4)
  const hiddenSkills = gig.skills.length - skills.length

  return (
    <Link
      href={`/gigs/${gig.id}`}
      className={cn(
        'glass glow-card reveal group flex flex-col gap-4 p-5',
        `tier-${tier}`,
        gig.status !== 'open' && 'opacity-80',
      )}
      style={{ '--i': index } as React.CSSProperties}
    >
      {/* Reward + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="hud text-xl font-semibold text-chalk">{formatRupees(gig.reward_amount)}</p>
          <p className="mt-0.5 text-[11px] text-dim">
            {gig.estimated_hours ? `est. ${gig.estimated_hours}h` : 'scope negotiable'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {gig.status === 'open' ? (
            <span className="tier-ring rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none">
              {GIG_TYPE_LABEL[gig.gig_type]}
            </span>
          ) : (
            <StatusPill status={gig.status} />
          )}
          {gig.is_remote && (
            <span className="inline-flex items-center gap-1 text-[11px] text-teal">
              <IconWifi className="size-3" />
              Remote
            </span>
          )}
        </div>
      </div>

      {/* The ask */}
      <div className="min-w-0 space-y-1.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-chalk transition-colors group-hover:text-cyan">
          {gig.title}
        </h3>
        {!compact && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-mist">{gig.description}</p>
        )}
      </div>

      {/* Tags */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <SkillChip key={s.id} name={s.name} />
          ))}
          {hiddenSkills > 0 && (
            <span className="inline-flex items-center px-1 text-[11.5px] text-dim">
              +{hiddenSkills}
            </span>
          )}
        </div>
      )}

      {/* Meta strip */}
      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-dim">
          <span className="inline-flex items-center gap-1">
            <IconMapPin className="size-3.5" />
            <span className="max-w-[11rem] truncate">
              {gig.is_remote && !gig.location_label ? 'Anywhere' : (gig.location_label ?? 'Location on request')}
            </span>
          </span>
          {deadline && (
            <span className={cn('inline-flex items-center gap-1', deadline.urgent && 'text-amber')}>
              <IconClock className="size-3.5" />
              {deadline.label}
            </span>
          )}
          {applicants > 0 && (
            <span className="inline-flex items-center gap-1">
              <IconUsers className="size-3.5" />
              {applicants} {pluralize(applicants, 'applicant')}
            </span>
          )}
        </div>

        <div className="hairline" />

        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={gig.hirer?.full_name} src={gig.hirer?.avatar_url} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-mist">
                {gig.hirer?.full_name ?? 'A hirer'}
              </span>
              {gig.hirer && gig.hirer.rating_count > 0 && (
                <span className="hud block text-[10.5px] text-dimmer">
                  ★ {gig.hirer.rating.toFixed(1)} · {gig.hirer.rating_count}
                </span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-dimmer">{relativeTime(gig.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

/** One-line version, for dashboard lists. */
export function GigRow({ gig }: { gig: GigWithRelations }) {
  const deadline = deadlineInfo(gig.deadline)
  const applicants = gig.application_count ?? 0

  return (
    <Link
      href={`/gigs/${gig.id}`}
      className="group flex items-center gap-4 rounded-xl border border-line bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-cyan/30 hover:bg-white/[0.045]"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium text-chalk transition-colors group-hover:text-cyan">
          {gig.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-dim">
          <span>{GIG_TYPE_LABEL[gig.gig_type]}</span>
          {applicants > 0 && (
            <span>
              {applicants} {pluralize(applicants, 'applicant')}
            </span>
          )}
          {deadline && <span className={cn(deadline.urgent && 'text-amber')}>{deadline.label}</span>}
        </div>
      </div>
      <span className="hud shrink-0 text-sm font-semibold text-chalk">
        {formatRupees(gig.reward_amount)}
      </span>
      <span className="hidden shrink-0 sm:block">
        <StatusPill status={gig.status} />
      </span>
    </Link>
  )
}

/** Used where a card grid needs a "nothing here" tile that still looks designed. */
export function GigCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="glass reveal space-y-4 p-5"
      style={{ '--i': index } as React.CSSProperties}
      aria-hidden
    >
      <div className="h-6 w-24 rounded bg-white/[0.06]" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-white/[0.06]" />
        <div className="h-4 w-2/3 rounded bg-white/[0.04]" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-6 w-16 rounded-lg bg-white/[0.04]" />
        <div className="h-6 w-20 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="hairline" />
      <div className="h-7 w-32 rounded bg-white/[0.04]" />
    </div>
  )
}
