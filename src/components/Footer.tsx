import Image from 'next/image'
import Link from 'next/link'
import { INSTITUTE_NAME } from '@/lib/constants'

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'For appliers',
    links: [
      { href: '/gigs', label: 'Browse gigs' },
      { href: '/gigs/map', label: 'Gigs near me' },
      { href: '/learn', label: 'Free skill coach' },
      { href: '/verify', label: 'Get the student fee waiver' },
      { href: '/dashboard', label: 'My applications' },
    ],
  },
  {
    title: 'For hirers',
    links: [
      { href: '/gigs/new', label: 'Post a gig' },
      { href: '/verify', label: 'Verify your identity' },
      { href: '/dashboard', label: 'Manage postings' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="" width={32} height={32} className="size-8" />
              <span className="text-[16px] font-semibold tracking-tight text-chalk">
                Gig<span className="text-cyan">Nest</span>
              </span>
            </Link>
            <p className="max-w-xs text-[14px] leading-relaxed text-dim">
              Paid work around Varanasi. Anyone can post, anyone can apply, and {INSTITUTE_NAME}{' '}
              students who verify pay no platform fee.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <p className="eyebrow">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-mist transition-colors hover:text-chalk"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="space-y-3">
            <p className="eyebrow">Platform</p>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/login"
                  className="text-[14px] text-mist transition-colors hover:text-chalk"
                >
                  Admin
                </Link>
              </li>
              <li>
                <span className="text-[14px] text-dimmer">Payments happen off-platform</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="hairline my-9" />

        <div className="flex flex-col items-start justify-between gap-3 text-[13px] text-dimmer sm:flex-row sm:items-center">
          <p>
            Prototype built for a startup idea weekend. Not affiliated with {INSTITUTE_NAME}.
          </p>
          <p className="hud">Varanasi · 25.2677°N 82.9913°E</p>
        </div>
      </div>
    </footer>
  )
}
