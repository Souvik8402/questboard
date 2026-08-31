import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { ROLE_LABEL } from '@/lib/constants'
import { Avatar } from '@/components/Avatar'
import { NavClient, type NavLink } from '@/components/NavClient'
import { ButtonLink } from '@/components/ui/Button'
import { IconLogout, IconPlus } from '@/components/ui/Icons'

const PUBLIC_LINKS: NavLink[] = [
  { href: '/quests', label: 'Quest board' },
  { href: '/quests/map', label: 'Map' },
]

/**
 * Server component: reads the session once per request, then hands the
 * interactive shell to NavClient.
 */
export async function Nav() {
  const session = await getSession()
  const profile = session?.profile ?? null

  const links: NavLink[] = [
    ...PUBLIC_LINKS,
    ...(session ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
  ]

  const signedOutActions = (
    <>
      <ButtonLink href="/quests/new" variant="ghost" size="sm">
        Post a quest
      </ButtonLink>
      <ButtonLink href="/login" size="sm">
        Sign in
      </ButtonLink>
    </>
  )

  const signedInActions = (
    <>
      <ButtonLink href="/quests/new" variant="outline" size="sm" className="gap-1.5">
        <IconPlus className="size-3.5" />
        Post
      </ButtonLink>
      <Link
        href={profile ? `/profile/${profile.id}` : '/onboarding'}
        className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] py-1 pl-1 pr-3 transition-colors hover:border-cyan/30 hover:bg-white/[0.06]"
      >
        <Avatar name={profile?.full_name} src={profile?.avatar_url} size="sm" />
        <span className="max-w-28 truncate text-[13px] font-medium text-chalk">
          {profile?.full_name?.split(' ')[0] ?? 'Finish setup'}
        </span>
        {profile && (
          <span className="hidden text-[10px] uppercase tracking-wider text-dim lg:inline">
            {ROLE_LABEL[profile.role]}
          </span>
        )}
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="grid size-9 place-items-center rounded-lg text-dim transition-colors hover:bg-white/5 hover:text-rose"
        >
          <IconLogout className="size-4" />
        </button>
      </form>
    </>
  )

  const mobileExtras = session ? (
    <>
      <ButtonLink href="/quests/new" size="sm" className="w-full">
        Post a quest
      </ButtonLink>
      <ButtonLink
        href={profile ? `/profile/${profile.id}` : '/onboarding'}
        variant="secondary"
        size="sm"
        className="w-full"
      >
        {profile?.full_name ?? 'Finish setup'}
      </ButtonLink>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full rounded-xl px-3 py-2 text-[13px] font-medium text-dim transition-colors hover:bg-white/5 hover:text-rose"
        >
          Sign out
        </button>
      </form>
    </>
  ) : (
    <>
      <ButtonLink href="/login" size="sm" className="w-full">
        {isSupabaseConfigured ? 'Sign in' : 'Sign in (demo)'}
      </ButtonLink>
      <ButtonLink href="/quests/new" variant="secondary" size="sm" className="w-full">
        Post a quest
      </ButtonLink>
    </>
  )

  return (
    <NavClient links={links} mobileExtras={mobileExtras}>
      {session ? signedInActions : signedOutActions}
    </NavClient>
  )
}
