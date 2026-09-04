import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * Plain, uncontrolled form primitives. No 'use client' here on purpose — these
 * render inside <form action={serverAction}>, so they work without JS.
 */

const CONTROL =
  'w-full rounded-xl border border-line bg-ink/70 px-3.5 py-2.5 text-sm text-chalk ' +
  'placeholder:text-dimmer transition-colors outline-none ' +
  'hover:border-[#2c344a] focus:border-cyan/60 focus:bg-ink ' +
  'focus:ring-2 focus:ring-cyan/15 disabled:opacity-50'

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-[14px] font-medium text-chalk">
          {label}
          {required && <span className="text-rose/80">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose">{error}</p>
      ) : (
        hint && <p className="text-xs leading-relaxed text-dim">{hint}</p>
      )}
    </div>
  )
}

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(CONTROL, className)} {...rest} />
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(CONTROL, 'min-h-28 resize-y leading-relaxed', className)} {...rest} />
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, 'appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-dim"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

/** Prefixed input — used for ₹ amounts and phone numbers. */
export function InputWithPrefix({
  prefix,
  className,
  ...rest
}: { prefix: ReactNode } & ComponentProps<'input'>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-mist">
        {prefix}
      </span>
      <input className={cn(CONTROL, 'pl-9', className)} {...rest} />
    </div>
  )
}

export function Checkbox({
  label,
  hint,
  className,
  ...rest
}: { label: ReactNode; hint?: string } & ComponentProps<'input'>) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white/[0.02] p-3.5',
        'transition-colors hover:border-[#2c344a] hover:bg-white/[0.04]',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line bg-ink accent-cyan"
        {...rest}
      />
      <span className="space-y-0.5">
        <span className="block text-[14px] font-medium text-chalk">{label}</span>
        {hint && <span className="block text-xs leading-relaxed text-dim">{hint}</span>}
      </span>
    </label>
  )
}

/**
 * A radio styled as a selectable card. `peer-checked` does the highlighting, so
 * selection state needs no JavaScript.
 */
export function RadioCard({
  name,
  value,
  label,
  blurb,
  icon,
  defaultChecked,
  disabled,
}: {
  name: string
  value: string
  label: string
  blurb?: string
  icon?: ReactNode
  defaultChecked?: boolean
  disabled?: boolean
}) {
  return (
    <label className={cn('group relative block', disabled && 'cursor-not-allowed opacity-50')}>
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <div
        className={cn(
          'h-full rounded-xl border border-line bg-white/[0.02] p-4 transition-all',
          'peer-checked:border-cyan/55 peer-checked:bg-cyan/[0.07]',
          'peer-checked:shadow-[0_0_0_1px_rgba(34,211,238,0.25)]',
          !disabled && 'group-hover:border-[#2f3852] group-hover:bg-white/[0.045] cursor-pointer',
        )}
      >
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 shrink-0 text-mist">{icon}</span>}
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-chalk">{label}</p>
            {blurb && <p className="text-xs leading-relaxed text-mist">{blurb}</p>}
          </div>
        </div>
      </div>
    </label>
  )
}
