import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import type { PublicProfile } from '@/lib/types'

const SIZES = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-20 text-xl',
} as const

const PX = { sm: 28, md: 36, lg: 48, xl: 80 } as const

export type AvatarSize = keyof typeof SIZES

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string | null | undefined
  src?: string | null
  size?: AvatarSize
  className?: string
}) {
  const shell = cn(
    'relative shrink-0 overflow-hidden rounded-full border border-line',
    'grid place-items-center font-semibold',
    SIZES[size],
    className,
  )

  if (src) {
    return (
      <span className={shell}>
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          width={PX[size]}
          height={PX[size]}
          className="size-full object-cover"
          unoptimized
        />
      </span>
    )
  }

  return (
    <span
      className={cn(shell, 'bg-linear-to-br from-cyan/25 to-violet/25 text-chalk')}
      aria-hidden={!name}
    >
      {initials(name)}
    </span>
  )
}

/** Avatar + name + meta line. The whole thing links to the public profile. */
export function UserChip({
  profile,
  size = 'md',
  meta,
  href,
  className,
}: {
  profile: Pick<PublicProfile, 'id' | 'full_name' | 'avatar_url'> | null
  size?: AvatarSize
  meta?: string
  href?: string | null
  className?: string
}) {
  const name = profile?.full_name ?? 'Someone'
  const body = (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar name={profile?.full_name} src={profile?.avatar_url} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-chalk">{name}</span>
        {meta && <span className="block truncate text-[12px] text-dim">{meta}</span>}
      </span>
    </span>
  )

  const target = href === null ? null : (href ?? (profile ? `/profile/${profile.id}` : null))
  if (!target) return body

  return (
    <Link href={target} className="group/chip inline-flex min-w-0 hover:opacity-90">
      {body}
    </Link>
  )
}
