'use client'

import { useActionState, useState } from 'react'
import {
  DISPUTE_REASONS,
  DISPUTE_REASON_LABEL,
  DISPUTE_SLA_LABEL,
  DISPUTE_STATUS_LABEL,
  DISPUTE_WINDOW_HOURS,
} from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import type { ActionResult, Dispute } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconScale } from '@/components/ui/Icons'
import { raiseDispute } from '../actions'

/**
 * "Something went wrong?" — the dispute window (item 8).
 *
 * Collapsed by default, because a panel shouting about disputes on every gig
 * page would make an honest handover feel adversarial. It opens on click.
 *
 * The number we actually promise is the response time, not the verdict: an admin
 * reads both sides plus the thread, and the thread cannot be edited or deleted,
 * which is why it is worth having as the only channel.
 */
export function DisputePanel({
  gigId,
  windowLabel,
  windowOpen,
  existing,
}: {
  gigId: string
  windowLabel: string
  windowOpen: boolean
  existing: Dispute[]
}) {
  const [open, setOpen] = useState(false)
  const [result, act] = useActionState<ActionResult | null, FormData>(raiseDispute, null)

  const mine = existing[0] ?? null

  if (mine) {
    return (
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-chalk">
            <IconScale className="size-4 text-amber" />
            Dispute {DISPUTE_STATUS_LABEL[mine.status].toLowerCase()}
          </p>
          <Badge tone={mine.status === 'open' ? 'amber' : 'teal'}>
            {DISPUTE_REASON_LABEL[mine.reason] ?? mine.reason}
          </Badge>
        </div>

        <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-mist">
          {mine.detail}
        </p>

        <p className="mt-3 text-[12.5px] text-dim">Raised {relativeTime(mine.created_at)}.</p>

        {mine.resolution ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="eyebrow">How it was settled</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">{mine.resolution}</p>
          </div>
        ) : (
          <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-relaxed text-dim">
            An admin is reading both sides and the thread. Average resolution is{' '}
            <span className="text-chalk">{DISPUTE_SLA_LABEL}</span>.
          </p>
        )}
      </Panel>
    )
  }

  if (!windowOpen) {
    return (
      <p className="text-[12.5px] leading-relaxed text-dim">
        The {DISPUTE_WINDOW_HOURS}-hour dispute window for this gig has closed. {windowLabel}. You
        can still message the other side in your inbox.
      </p>
    )
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <IconScale className="size-3.5" />
          Something went wrong?
        </Button>
        <span className="text-[12.5px] text-dim">
          {windowLabel} · average resolution {DISPUTE_SLA_LABEL}
        </span>
      </div>
    )
  }

  return (
    <Panel className="p-5">
      <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-chalk">
        <IconScale className="size-4 text-amber" />
        Raise a dispute
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist">
        Open for {DISPUTE_WINDOW_HOURS} hours after the last status change — {windowLabel}. An admin
        reads your side, the other side, and the whole thread. Average resolution is{' '}
        <span className="text-chalk">{DISPUTE_SLA_LABEL}</span>.
      </p>

      {result && (
        <div className="mt-4">
          <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>
        </div>
      )}

      {!result?.ok && (
        <form action={act} className="mt-4 space-y-4">
          <input type="hidden" name="gigId" value={gigId} />

          <Field label="What is the problem?" htmlFor="reason" required>
            <Select id="reason" name="reason" defaultValue="" required>
              <option value="" disabled>
                Pick the closest one
              </option>
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="What happened?"
            htmlFor="detail"
            required
            hint="Dates, amounts and what was agreed. The more concrete this is, the faster it closes."
            error={result && !result.ok ? result.message : undefined}
          >
            <Textarea
              id="detail"
              name="detail"
              required
              minLength={20}
              maxLength={1500}
              placeholder="We agreed ₹1,500 on delivery. I sent the files on the 3rd and have not been paid since."
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <SubmitButton size="sm">File the dispute</SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}
