import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { GIG_STATUS_LABEL } from '@/lib/constants'
import type { GigStatus, ApplicationStatus } from '@/lib/types'

export type BadgeTone =
  | 'neutral'
  | 'cyan'
  | 'violet'
  | 'lime'
  | 'amber'
  | 'rose'
  | 'teal'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line bg-white/[0.04] text-mist',
  cyan: 'border-cyan/30 bg-cyan/10 text-cyan',
  violet: 'border-violet/30 bg-violet/10 text-violet',
  lime: 'border-lime/30 bg-lime/10 text-lime',
  amber: 'border-amber/30 bg-amber/10 text-amber',
  rose: 'border-rose/30 bg-rose/10 text-rose',
  teal: 'border-teal/30 bg-teal/10 text-teal',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-[12px] font-medium leading-none tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const GIG_STATUS_TONE: Record<GigStatus, BadgeTone> = {
  open: 'lime',
  assigned: 'cyan',
  in_progress: 'violet',
  completed: 'teal',
  cancelled: 'rose',
}

export function StatusPill({ status }: { status: GigStatus }) {
  return (
    <Badge tone={GIG_STATUS_TONE[status]}>
      {status === 'open' && (
        <span className="live-dot size-1.5 shrink-0 rounded-full bg-lime" aria-hidden />
      )}
      {GIG_STATUS_LABEL[status]}
    </Badge>
  )
}

const APPLICATION_TONE: Record<ApplicationStatus, BadgeTone> = {
  pending: 'amber',
  accepted: 'lime',
  rejected: 'rose',
  withdrawn: 'neutral',
}

const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Awaiting reply',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn',
}

export function ApplicationPill({ status }: { status: ApplicationStatus }) {
  return <Badge tone={APPLICATION_TONE[status]}>{APPLICATION_LABEL[status]}</Badge>
}

/** A skill tag. Renders as a link when `href` is given, so tags are clickable. */
export function SkillChip({
  name,
  href,
  active = false,
  onRemove,
}: {
  name: string
  href?: string
  active?: boolean
  onRemove?: () => void
}) {
  const body = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1',
        'text-[12.5px] font-medium transition-colors',
        active
          ? 'border-cyan/45 bg-cyan/15 text-cyan'
          : 'border-line bg-white/[0.03] text-mist hover:border-cyan/30 hover:text-chalk',
      )}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="-mr-0.5 grid size-3.5 place-items-center rounded-sm text-current opacity-60 hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  )

  if (href) {
    return (
      <a href={href} className="inline-block">
        {body}
      </a>
    )
  }
  return body
}
