import Link from 'next/link'
import { INSTITUTE_NAME } from '@/lib/constants'

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'For students',
    links: [
      { href: '/quests', label: 'Browse quests' },
      { href: '/quests/map', label: 'Quests near me' },
      { href: '/login', label: 'Verify with institute email' },
      { href: '/dashboard', label: 'My applications' },
    ],
  },
  {
    title: 'For hirers',
    links: [
      { href: '/quests/new', label: 'Post a quest' },
      { href: '/login', label: 'Create an account' },
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
              <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-cyan to-violet">
                <svg viewBox="0 0 24 24" fill="none" className="size-4.5 text-void">
                  <path
                    d="M12 3.2l2.3 4.9 5.4.7-3.9 3.8.9 5.4-4.7-2.6-4.7 2.6.9-5.4-3.9-3.8 5.4-.7L12 3.2Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-chalk">
                Quest<span className="text-cyan">Board</span>
              </span>
            </Link>
            <p className="max-w-xs text-[13px] leading-relaxed text-dim">
              Paid work around Varanasi, claimed by verified {INSTITUTE_NAME} students. Post in a
              minute, hire the same day.
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
                      className="text-[13px] text-mist transition-colors hover:text-chalk"
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
                  className="text-[13px] text-mist transition-colors hover:text-chalk"
                >
                  Admin
                </Link>
              </li>
              <li>
                <span className="text-[13px] text-dimmer">Payments happen off-platform</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="hairline my-9" />

        <div className="flex flex-col items-start justify-between gap-3 text-[12px] text-dimmer sm:flex-row sm:items-center">
          <p>
            Prototype built for a startup idea weekend. Not affiliated with {INSTITUTE_NAME}.
          </p>
          <p className="hud">Varanasi · 25.2677°N 82.9913°E</p>
        </div>
      </div>
    </footer>
  )
}
