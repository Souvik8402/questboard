import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getAdminQuests,
  getAdminReviews,
  getAdminStats,
  getAdminUsers,
} from '@/lib/admin-queries'
import { compactRupees } from '@/lib/format'
import { Panel } from '@/components/ui/Panel'
import { QuestTable } from './_components/QuestTable'
import { ReviewList } from './_components/ReviewList'
import { UserTable } from './_components/UserTable'

export const metadata: Metadata = {
  title: 'Admin panel',
  robots: { index: false, follow: false },
}

const TABS = [
  { value: 'users', label: 'Accounts' },
  { value: 'quests', label: 'Quests' },
  { value: 'reviews', label: 'Reviews' },
] as const

type Tab = (typeof TABS)[number]['value']

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab: Tab = TABS.some((t) => t.value === rawTab) ? (rawTab as Tab) : 'users'

  // All four run regardless of tab: the counters at the top need the totals, and
  // the dataset is small enough that lazy-loading per tab would just add code.
  const [stats, users, quests, reviews] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
    getAdminQuests(),
    getAdminReviews(),
  ])

  return (
    <div className="space-y-7">
      {/* ── Counters ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock
          label="Accounts"
          value={stats.users}
          accent="cyan"
          rows={[
            ['Students', stats.students],
            ['Hirers', stats.hirers],
            ['Suspended', stats.banned],
          ]}
        />
        <StatBlock
          label="Quests"
          value={stats.quests}
          accent="lime"
          rows={[
            ['Open', stats.open],
            ['Completed', stats.completed],
            ['Cancelled', stats.cancelled],
          ]}
        />
        <StatBlock
          label="Applications"
          value={stats.applications}
          accent="violet"
          rows={[
            ['Accepted', stats.accepted],
            ['Reviews left', stats.reviews],
            [
              'Per quest',
              stats.quests ? (stats.applications / stats.quests).toFixed(1) : '—',
            ],
          ]}
        />
        <StatBlock
          label="Open reward pool"
          value={compactRupees(stats.reward_pool)}
          accent="amber"
          rows={[
            ['Paid out', compactRupees(stats.completed_value)],
            [
              'Avg open reward',
              stats.open ? compactRupees(Math.round(stats.reward_pool / stats.open)) : '—',
            ],
          ]}
        />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
          {TABS.map((t) => {
            const count =
              t.value === 'users' ? users.length : t.value === 'quests' ? quests.length : reviews.length
            const active = tab === t.value
            return (
              <Link
                key={t.value}
                href={`/admin?tab=${t.value}`}
                scroll={false}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'border-cyan/45 bg-cyan/15 text-cyan'
                    : 'border-line bg-white/[0.03] text-mist hover:border-cyan/30 hover:text-chalk'
                }`}
              >
                {t.label}
                <span className={`hud text-[11px] ${active ? 'text-cyan/80' : 'text-dim'}`}>
                  {count}
                </span>
              </Link>
            )
          })}
        </div>

        <div className="mt-5">
          {tab === 'users' && <UserTable users={users} />}
          {tab === 'quests' && <QuestTable quests={quests} />}
          {tab === 'reviews' && <ReviewList reviews={reviews} />}
        </div>
      </div>
    </div>
  )
}

function StatBlock({
  label,
  value,
  accent,
  rows,
}: {
  label: string
  value: string | number
  accent: 'cyan' | 'violet' | 'lime' | 'amber'
  rows: [string, string | number][]
}) {
  const colour = { cyan: 'text-cyan', violet: 'text-violet', lime: 'text-lime', amber: 'text-amber' }[
    accent
  ]

  return (
    <Panel className="p-4">
      <p className="eyebrow">{label}</p>
      <p className={`hud mt-1 text-2xl font-semibold ${colour}`}>{value}</p>
      <dl className="mt-3 space-y-1 border-t border-line pt-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11.5px] text-dim">{k}</dt>
            <dd className="hud text-[11.5px] text-chalk">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
