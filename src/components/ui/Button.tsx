import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'rounded-xl transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed ' +
  'disabled:pointer-events-none active:scale-[0.985] select-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'text-void bg-linear-to-r from-cyan to-teal shadow-[0_6px_24px_-8px_rgba(34,211,238,0.6)] ' +
    'hover:shadow-[0_8px_30px_-6px_rgba(34,211,238,0.75)] hover:brightness-110 font-semibold',
  secondary: 'text-chalk bg-raise border border-line hover:bg-[#1c2233] hover:border-[#2f3852]',
  ghost: 'text-mist hover:text-chalk hover:bg-white/5',
  outline:
    'text-chalk border border-line bg-white/[0.02] hover:bg-white/[0.06] ' +
    'hover:border-cyan/40',
  danger:
    'text-rose border border-rose/30 bg-rose/10 hover:bg-rose/20 hover:border-rose/50',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-[13px] px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-[15px] px-6 py-3',
}

interface StyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

function classes({ variant = 'primary', size = 'md', className }: StyleProps): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className)
}

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: StyleProps & ComponentProps<'button'>) {
  return (
    <button className={classes({ variant, size, className })} {...rest}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...rest
}: StyleProps & ComponentProps<typeof Link>) {
  return (
    <Link className={classes({ variant, size, className })} {...rest}>
      {children}
    </Link>
  )
}

/** Anchor variant, for external links. */
export function ButtonAnchor({
  variant,
  size,
  className,
  children,
  ...rest
}: StyleProps & ComponentProps<'a'>) {
  return (
    <a className={classes({ variant, size, className })} {...rest}>
      {children}
    </a>
  )
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: { label: string; children: ReactNode } & ComponentProps<'button'>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid size-9 place-items-center rounded-lg text-mist transition-colors',
        'hover:bg-white/5 hover:text-chalk',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
