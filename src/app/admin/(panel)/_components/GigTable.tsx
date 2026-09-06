'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { AdminGig } from '@/lib/admin-queries'
import { GIG_STATUSES, GIG_STATUS_LABEL, GIG_TYPE_LABEL } from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import type { ActionResult, GigStatus, GigType } from '@/lib/types'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconSearch, IconTrash } from '@/components/ui/Icons'
import { adminDeleteGig, adminSetGigStatus } from '../../actions'

export function GigTable({ gigs }: { gigs: AdminGig[] }) {
  // One action slot for both mutations; the hidden `intent` picks the branch.
  const [result, act] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    return form.get('intent') === 'delete'
      ? adminDeleteGig(prev, form)
      : adminSetGigStatus(prev, form)
  }, null)

  const [status, setStatus] = useState<GigStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const shown = gigs.filter((gig) => {
    if (status !== 'all' && gig.status !== status) return false
    if (!q) return true
    return (
      gig.title.toLowerCase().includes(q) ||
      (gig.hirer_name ?? '').toLowerCase().includes(q) ||
      (gig.location_label ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, hirer or place…"
            className="w-full rounded-xl border border-line bg-white/80 py-2 pl-10 pr-3.5 text-[14px] text-chalk outline-none transition-colors placeholder:text-dimmer hover:border-[#bfb9b0] focus:border-cyan/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...GIG_STATUSES] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                status === value
                  ? 'border-cyan/45 bg-cyan/15 text-cyan'
                  : 'border-line bg-black/[0.03] text-mist hover:border-cyan/30 hover:text-chalk'
              }`}
            >
              {value === 'all' ? 'All' : GIG_STATUS_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {result && <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>}

      <Panel className="divide-y divide-line/70 p-0">
        {shown.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-dim">No gig matches that.</p>
        )}

        {shown.map((gig) => (
          <div key={gig.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={gig.status} />
                  <Badge tone="neutral">
                    {GIG_TYPE_LABEL[gig.gig_type as GigType] ?? gig.gig_type}
                  </Badge>
                  {gig.is_remote && <Badge tone="teal">Remote</Badge>}
                </div>
                <Link
                  href={`/gigs/${gig.id}`}
                  className="mt-2 block text-[14.5px] font-medium leading-snug text-chalk hover:text-cyan"
                >
                  {gig.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-dim">
                  <span className="hud text-mist">{formatRupees(gig.reward_amount)}</span>
                  <Link href={`/profile/${gig.hirer_id}`} className="hover:text-cyan">
                    {gig.hirer_name ?? 'Unknown hirer'}
                  </Link>
                  <span>{gig.application_count} applied</span>
                  <span>{gig.views} views</span>
                  <span className="text-dimmer">{relativeTime(gig.created_at)}</span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <form action={act} className="flex items-center gap-1.5">
                  <input type="hidden" name="intent" value="status" />
                  <input type="hidden" name="gig_id" value={gig.id} />
                  <select
                    name="status"
                    defaultValue={gig.status}
                    className="rounded-lg border border-line bg-white/80 px-2 py-1.5 text-[13px] text-chalk outline-none transition-colors hover:border-[#bfb9b0] focus:border-cyan/60"
                  >
                    {GIG_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {GIG_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                    Set
                  </SubmitButton>
                </form>

                {confirming === gig.id ? (
                  <form action={act} className="flex items-center gap-1.5">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="gig_id" value={gig.id} />
                    <SubmitButton size="sm" variant="danger" pendingLabel="Deleting…">
                      Confirm delete
                    </SubmitButton>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-[13px] text-dim hover:text-chalk"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(gig.id)}
                    aria-label="Delete gig"
                    title="Delete gig and its applications"
                    className="grid size-8 place-items-center rounded-lg border border-line text-dim transition-colors hover:border-rose/40 hover:text-rose"
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </Panel>

      <p className="text-[12.5px] text-dim">
        Showing {shown.length} of {gigs.length}. Forcing a status here skips the normal
        transition rules — deleting also removes applications, tags and the gig&rsquo;s message
        thread.
      </p>
    </div>
  )
}
