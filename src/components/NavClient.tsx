'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { BROWSE_CATEGORIES } from '@/lib/constants'
import { IconMenu, IconSearch, IconX } from '@/components/ui/Icons'

export interface NavLink {
  href: string
  label: string
}

/**
 * The interactive half of the nav: scroll shadow, active link, mobile drawer.
 * Everything session-dependent is passed in from the server component so this
 * never needs to fetch.
 */
export function NavClient({
  links,
  children,
  mobilePrimary,
  mobileExtras,
}: {
  links: NavLink[]
  /** Right-hand actions, rendered by the server (sign in / avatar / post). */
  children: React.ReactNode
  /**
   * The single most important action, kept visible in the mobile bar instead
   * of buried behind the hamburger — signing in should never cost a tap to
   * discover.
   */
  mobilePrimary: React.ReactNode
  mobileExtras: React.ReactNode
}) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [pathname])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-line bg-void/85 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative grid size-8 place-items-center rounded-lg bg-linear-to-br from-cyan to-violet shadow-[0_6px_18px_-6px_rgba(36,95,115,0.55)]">
            <svg viewBox="0 0 24 24" fill="none" className="size-4.5 text-white">
              <path
                d="M12 3.2l2.3 4.9 5.4.7-3.9 3.8.9 5.4-4.7-2.6-4.7 2.6.9-5.4-3.9-3.8 5.4-.7L12 3.2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="text-[16px] font-semibold tracking-tight text-chalk">
            Gig<span className="text-cyan">Nest</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'relative rounded-lg px-3 py-2 text-[14.5px] font-medium transition-colors',
                isActive(l.href) ? 'text-chalk' : 'text-mist hover:text-chalk',
              )}
            >
              {l.label}
              {isActive(l.href) && (
                <span className="absolute inset-x-3 -bottom-px h-px bg-linear-to-r from-transparent via-cyan to-transparent" />
              )}
            </Link>
          ))}
        </nav>

        <form action="/gigs" method="get" className="relative hidden lg:block">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dimmer" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gigs…"
            aria-label="Search gigs"
            className="w-52 rounded-xl border border-line bg-white/70 py-2 pl-9 pr-3 text-[13.5px] text-chalk outline-none transition-colors placeholder:text-dimmer hover:border-[#bfb9b0] focus:border-cyan/50 focus:bg-white focus:ring-2 focus:ring-cyan/15 xl:w-56"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">{children}</div>
          <div className="md:hidden">{mobilePrimary}</div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-lg text-mist transition-colors hover:bg-black/5 hover:text-chalk md:hidden"
          >
            {open ? <IconX className="size-5" /> : <IconMenu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Browse categories — Fiverr-style row. Static, so it renders on every
          route without a database hit; each entry runs the same search a visitor
          could type into the box above. */}
      <div className="hidden border-t border-line bg-void/60 md:block">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          <Link
            href="/gigs"
            className={cn(
              'shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-medium transition-colors',
              pathname === '/gigs' || pathname === '/gigs/map'
                ? 'text-chalk'
                : 'text-mist hover:text-chalk',
            )}
          >
            All gigs
          </Link>
          <span className="mx-1 h-3.5 w-px shrink-0 bg-line" />
          {BROWSE_CATEGORIES.map((c) => (
            <Link
              key={c.q}
              href={`/gigs?q=${encodeURIComponent(c.q)}`}
              className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[13px] font-medium text-mist transition-colors hover:text-chalk hover:bg-black/[0.04]"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'overflow-hidden border-line bg-void/95 backdrop-blur-xl transition-[max-height] duration-300 md:hidden',
          open ? 'max-h-[75dvh] border-b' : 'max-h-0',
        )}
      >
        <div className="space-y-1 px-4 pb-5 pt-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(l.href)
                  ? 'bg-cyan/10 text-cyan'
                  : 'text-mist hover:bg-black/5 hover:text-chalk',
              )}
            >
              {l.label}
            </Link>
          ))}
          <div className="hairline my-3" />
          <div className="flex flex-col gap-2">{mobileExtras}</div>
        </div>
      </div>
    </header>
  )
}
