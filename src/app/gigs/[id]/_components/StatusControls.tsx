'use client'

import { useActionState } from 'react'
import { GIG_STATUS_LABEL } from '@/lib/constants'
import type { ActionResult, GigStatus } from '@/lib/types'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { StatusPill } from '@/components/ui/Badge'
import { updateGigStatus, withdrawApplication } from '../actions'

type Move = { status: GigStatus; label: string; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }

/**
 * What each side may do next. Mirrors `set_gig_status` in schema.sql: the
 * owner can move a gig anywhere, the assigned student can only start it.
 */
function movesFor(status: GigStatus, isOwner: boolean): Move[] {
  if (isOwner) {
    switch (status) {
      case 'open':
        return [{ status: 'cancelled', label: 'Cancel gig', variant: 'danger' }]
      case 'assigned':
        return [
          { status: 'in_progress', label: 'Mark in progress', variant: 'secondary' },
          { status: 'completed', label: 'Mark complete' },
          { status: 'cancelled', label: 'Cancel', variant: 'ghost' },
        ]
      case 'in_progress':
        return [
          { status: 'completed', label: 'Mark complete' },
          { status: 'cancelled', label: 'Cancel', variant: 'ghost' },
        ]
      case 'completed':
        return []
      case 'cancelled':
        return [{ status: 'open', label: 'Reopen gig', variant: 'secondary' }]
    }
  }
  // Assigned student.
  return status === 'assigned'
    ? [{ status: 'in_progress', label: "I've started work" }]
    : []
}

export function StatusControls({
  gigId,
  status,
  isOwner,
  applicationId,
}: {
  gigId: string
  status: GigStatus
  isOwner: boolean
  /** Present when the viewer is a student with a live application. */
  applicationId?: string | null
}) {
  const [result, act] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    return form.get('intent') === 'withdraw'
      ? withdrawApplication(prev, form)
      : updateGigStatus(prev, form)
  }, null)

  const moves = movesFor(status, isOwner)
  const canWithdraw = Boolean(applicationId) && (status === 'open' || status === 'assigned')

  if (moves.length === 0 && !canWithdraw) return null

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-chalk">
          {isOwner ? 'Manage gig' : 'Your gig'}
        </h2>
        <StatusPill status={status} />
      </div>

      <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist">
        Currently <span className="text-chalk">{GIG_STATUS_LABEL[status].toLowerCase()}</span>.
        {status === 'completed'
          ? ' Reviews are open — leave one below.'
          : isOwner
            ? ' Only you can move it along.'
            : ' Mark it started so the hirer knows you are on it.'}
      </p>

      {result && (
        <div className="mt-3">
          <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>
        </div>
      )}

      <form action={act} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="gigId" value={gigId} />
        {moves.map((move) => (
          <SubmitButton
            key={move.status}
            name="status"
            value={move.status}
            size="sm"
            variant={move.variant ?? 'primary'}
          >
            {move.label}
          </SubmitButton>
        ))}
      </form>

      {canWithdraw && (
        <form action={act} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="gigId" value={gigId} />
          <input type="hidden" name="applicationId" value={applicationId ?? ''} />
          <input type="hidden" name="intent" value="withdraw" />
          <SubmitButton size="sm" variant="ghost">
            Withdraw my application
          </SubmitButton>
        </form>
      )}
    </Panel>
  )
}
