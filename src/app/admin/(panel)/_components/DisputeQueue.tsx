'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { AdminDispute } from '@/lib/admin-queries'
import {
  DISPUTE_REASON_LABEL,
  DISPUTE_SLA_LABEL,
  DISPUTE_STATUS_LABEL,
} from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import type { ActionResult, DisputeStatus } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Field'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconScale } from '@/components/ui/Icons'
import { resolveDispute } from '../../actions'

const TONE: Record<DisputeStatus, BadgeTone> = {
  open: 'rose',
  resolved: 'lime',
  rejected: 'neutral',
}

/**
 * The dispute queue (item 8).
 *
 * This screen is the published promise made concrete: a response in about two
 * hours. That is a promise about how fast somebody reads a paragraph and writes a
 * reply, not about who wins — which is the only kind of promise a two-person team
 * can actually keep.
 *
 * The gig thread is the evidence. Messages cannot be edited or deleted, so what
 * both sides agreed is readable after the fact; that is the reason contact details
 * are kept off the platform in the first place.
 */
export function DisputeQueue({ rows }: { rows: AdminDispute[] }) {
  const [result, act] = useActionState<ActionResult | null, FormData>(resolveDispute, null)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconScale className="size-5" />}
        title="No disputes"
        blurb={`Either side can raise one from the gig page for 72 hours after the last status change. Published resolution time: ${DISPUTE_SLA_LABEL}.`}
      />
    )
  }

  const open = rows.filter((r) => r.status === 'open').length

  return (
    <div className="space-y-3">
      {result && <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13.5px] text-mist">
          {open === 0 ? 'Nothing open.' : `${open} open. The promise on every page is ${DISPUTE_SLA_LABEL}.`}
        </p>
        <p className="text-[12.5px] text-dim">Read the gig thread before deciding.</p>
      </div>

      <Panel className="divide-y divide-line/70 p-0">
        {rows.map((row) => (
          <div key={row.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <Avatar name={row.raiser?.full_name} src={row.raiser?.avatar_url} size="sm" />

              <div className="min-w-[220px] flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/profile/${row.raised_by}`}
                    className="text-[14px] font-medium text-chalk hover:text-cyan"
                  >
                    {row.raiser?.full_name ?? 'Someone'}
                  </Link>
                  <span className="text-[12.5px] text-dimmer">raised</span>
                  <Badge tone={TONE[row.status]}>{DISPUTE_STATUS_LABEL[row.status]}</Badge>
                  <Badge tone="amber">
                    {DISPUTE_REASON_LABEL[row.reason] ?? row.reason}
                  </Badge>
                  <span className="text-[12px] text-dimmer">
                    {row.status === 'open'
                      ? relativeTime(row.created_at)
                      : `closed ${relativeTime(row.resolved_at)}`}
                  </span>
                </div>

                {row.gig && (
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                    <Link href={`/gigs/${row.gig_id}`} className="font-medium text-cyan hover:underline">
                      {row.gig.title}
                    </Link>
                    <span className="hud text-dim">{formatRupees(row.gig.reward_amount)}</span>
                    <span className="text-dim">· gig is {row.gig.status.replace('_', ' ')}</span>
                  </p>
                )}

                <p className="rounded-lg border border-line bg-black/[0.02] px-3 py-2 text-[13px] leading-relaxed text-mist">
                  {row.detail}
                </p>

                <p className="text-[12.5px]">
                  <Link href={`/inbox/${row.gig_id}`} className="text-dim hover:text-cyan">
                    Open the gig thread →
                  </Link>
                </p>
              </div>
            </div>

            {row.status === 'open' ? (
              <form action={act} className="space-y-2 border-t border-line/70 pt-3">
                <input type="hidden" name="dispute_id" value={row.id} />
                <Textarea
                  name="resolution"
                  required
                  minLength={10}
                  maxLength={1000}
                  className="min-h-16 text-[13px]"
                  placeholder="What you decided and why. Both sides read this, and it is the only record of the outcome."
                />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton
                    size="sm"
                    variant="secondary"
                    name="outcome"
                    value="resolved"
                    pendingLabel="…"
                  >
                    Close as resolved
                  </SubmitButton>
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    name="outcome"
                    value="rejected"
                    pendingLabel="…"
                  >
                    Close, no action
                  </SubmitButton>
                </div>
              </form>
            ) : (
              row.resolution && (
                <p className="border-t border-line/70 pt-3 text-[13px] leading-relaxed text-mist">
                  <span className="font-medium text-chalk">Outcome:</span> {row.resolution}
                </p>
              )
            )}
          </div>
        ))}
      </Panel>

      <p className="text-[12.5px] leading-relaxed text-dim">
        Closing a dispute does not move the gig or the money — use the Gigs tab to cancel or
        complete a gig, and the Accounts tab if someone needs suspending.
      </p>
    </div>
  )
}
