import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getAdminDisputes,
  getAdminGigs,
  getAdminReviews,
  getAdminStats,
  getAdminUsers,
  getAdminVerifications,
  getAdminWaivers,
} from '@/lib/admin-queries'
import { compactRupees } from '@/lib/format'
import { Panel } from '@/components/ui/Panel'
import { DisputeQueue } from './_components/DisputeQueue'
import { GigTable } from './_components/GigTable'
import { ReviewList } from './_components/ReviewList'
import { UserTable } from './_components/UserTable'
import { VerificationQueue } from './_components/VerificationQueue'
import { WaiverQueue } from './_components/WaiverQueue'

export const metadata: Metadata = {
  title: 'Admin panel',
  robots: { index: false, follow: false },
}

/*
 * Tab order is roughly "how urgent": the three queues that have somebody waiting
 * on a decision come before the three lists you browse.
 */
const TABS = [
  { value: 'ids', label: 'Verification' },
  { value: 'waivers', label: 'Fee waivers' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'users', label: 'Accounts' },
  { value: 'gigs', label: 'Gigs' },
  { value: 'reviews', label: 'Reviews' },
] as const

type Tab = (typeof TABS)[number]['value']

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab: Tab = TABS.some((t) => t.value === rawTab) ? (rawTab as Tab) : 'ids'

  // All of them run regardless of tab: the counters at the top need the totals,
  // and the dataset is small enough that lazy-loading per tab would just add code.
  const [stats, users, gigs, reviews, verifications, waivers, disputes] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
    getAdminGigs(),
    getAdminReviews(),
    getAdminVerifications(),
    getAdminWaivers(),
    getAdminDisputes(),
  ])

  const counts: Record<Tab, number> = {
    ids: verifications.filter((v) => v.status === 'pending').length,
    waivers: waivers.filter((w) => w.status === 'pending').length,
    disputes: disputes.filter((d) => d.status === 'open').length,
    users: users.length,
    gigs: gigs.length,
    reviews: reviews.length,
  }

  return (
    <div className="space-y-7">
      {/* ── Counters ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* First, because it is the only one that is a to-do list rather than a
            readout. Everything to its right is context for it. */}
        <StatBlock
          label="Waiting on you"
          value={stats.ids_pending + stats.waivers_pending + stats.disputes_open}
          accent="amber"
          rows={[
            ['IDs to review', stats.ids_pending],
            ['Waiver requests', stats.waivers_pending],
            ['Open disputes', stats.disputes_open],
          ]}
        />
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
          label="Gigs"
          value={stats.gigs}
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
              'Per gig',
              stats.gigs ? (stats.applications / stats.gigs).toFixed(1) : '—',
            ],
          ]}
        />
        <StatBlock
          label="Open reward pool"
          value={compactRupees(stats.reward_pool)}
          accent="cyan"
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
            const count = counts[t.value]
            const active = tab === t.value
            // A queue with nothing in it should not shout. A queue with something
            // in it should, whichever tab you are looking at.
            const queue = t.value === 'ids' || t.value === 'waivers' || t.value === 'disputes'
            const waiting = queue && count > 0
            return (
              <Link
                key={t.value}
                href={`/admin?tab=${t.value}`}
                scroll={false}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[14px] font-medium transition-colors ${
                  active
                    ? 'border-cyan/45 bg-cyan/15 text-cyan'
                    : 'border-line bg-black/[0.03] text-mist hover:border-cyan/30 hover:text-chalk'
                }`}
              >
                {t.label}
                <span
                  className={`hud text-[12px] ${
                    waiting ? 'text-amber' : active ? 'text-cyan/80' : 'text-dim'
                  }`}
                >
                  {count}
                </span>
              </Link>
            )
          })}
        </div>

        <div className="mt-5">
          {tab === 'ids' && <VerificationQueue rows={verifications} />}
          {tab === 'waivers' && <WaiverQueue rows={waivers} />}
          {tab === 'disputes' && <DisputeQueue rows={disputes} />}
          {tab === 'users' && <UserTable users={users} />}
          {tab === 'gigs' && <GigTable gigs={gigs} />}
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
            <dt className="text-[12.5px] text-dim">{k}</dt>
            <dd className="hud text-[12.5px] text-chalk">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
