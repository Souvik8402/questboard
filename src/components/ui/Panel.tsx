import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Frosted surface used for essentially every container in the app. */
export function Panel({
  className,
  glow = false,
  children,
  ...rest
}: { glow?: boolean } & ComponentProps<'div'>) {
  return (
    <div className={cn('glass', glow && 'glow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  blurb,
  align = 'left',
  children,
}: {
  eyebrow?: string
  title: ReactNode
  blurb?: ReactNode
  align?: 'left' | 'center'
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
      )}
    >
      {eyebrow && (
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-cyan" />
          <span className="eyebrow">{eyebrow}</span>
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">{title}</h2>
      {blurb && (
        <p className={cn('max-w-2xl text-[16px] leading-relaxed text-mist')}>{blurb}</p>
      )}
      {children}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  blurb,
  action,
}: {
  icon?: ReactNode
  title: string
  blurb?: string
  action?: ReactNode
}) {
  return (
    <div className="glass flex flex-col items-center gap-4 px-6 py-16 text-center">
      {icon && (
        <div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.03] text-mist">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-base font-medium text-chalk">{title}</p>
        {blurb && <p className="mx-auto max-w-sm text-sm leading-relaxed text-mist">{blurb}</p>}
      </div>
      {action}
    </div>
  )
}

/** Big number + label, for the landing page and admin dashboard. */
export function StatTile({
  value,
  label,
  hint,
  accent = 'cyan',
  index = 0,
}: {
  value: string | number
  label: string
  hint?: string
  accent?: 'cyan' | 'violet' | 'lime' | 'amber'
  index?: number
}) {
  const glow = {
    cyan: 'text-cyan',
    violet: 'text-violet',
    lime: 'text-lime',
    amber: 'text-amber',
  }[accent]

  return (
    <div
      className="glass glow-card reveal p-5"
      style={{ '--i': index } as React.CSSProperties}
    >
      <p className={cn('hud text-3xl font-semibold', glow)}>{value}</p>
      <p className="mt-1.5 text-sm font-medium text-chalk">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-dim">{hint}</p>}
    </div>
  )
}

/** Inline notice — errors, warnings, and the demo-mode banner. */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warn' | 'error' | 'success'
  title?: string
  children?: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-cyan/25 bg-cyan/[0.07] text-cyan',
    warn: 'border-amber/25 bg-amber/[0.07] text-amber',
    error: 'border-rose/30 bg-rose/[0.08] text-rose',
    success: 'border-lime/25 bg-lime/[0.07] text-lime',
  }[tone]

  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', tones, className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn('leading-relaxed', title && 'mt-1 opacity-90')}>{children}</div>}
    </div>
  )
}
