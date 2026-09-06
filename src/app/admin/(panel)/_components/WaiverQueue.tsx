'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { AdminWaiver } from '@/lib/admin-queries'
import {
  FEE_WAIVER_LABEL,
  INSTITUTE_NAME,
  PLATFORM_FEE_LABEL,
  isInstituteEmail,
} from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import type { ActionResult, FeeWaiverStatus } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Field'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconCoins } from '@/components/ui/Icons'
import { decideWaiver } from '../../actions'

const TONE: Record<FeeWaiverStatus, BadgeTone> = {
  none: 'neutral',
  pending: 'amber',
  approved: 'lime',
  rejected: 'rose',
}

/**
 * The fee-waiver queue (item 2).
 *
 * The decision is narrow on purpose: is this person really a student at the
 * institute? The signup email is the strong signal — `request_fee_waiver()` in
 * schema.sql already refuses anyone whose mailbox is not an institute one, so a
 * row reaching this screen has cleared that check and what is left is matching a
 * name to a course.
 *
 * Worth keeping in mind while clicking Refuse: this decides what someone is *paid*,
 * not whether they may work. A refused waiver costs them the platform fee on a
 * reward and nothing else.
 */
export function WaiverQueue({ rows }: { rows: AdminWaiver[] }) {
  const [result, act] = useActionState<ActionResult | null, FormData>(decideWaiver, null)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconCoins className="size-5" />}
        title="No waiver requests"
        blurb={`${INSTITUTE_NAME} students ask for the platform fee to be waived from their verification page. Everyone else pays ${PLATFORM_FEE_LABEL}, and everyone can apply for gigs either way.`}
      />
    )
  }

  const pending = rows.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-3">
      {result && <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13.5px] text-mist">
          {pending === 0 ? 'Nothing waiting.' : `${pending} waiting on you.`}
        </p>
        <p className="text-[12.5px] text-dim">
          Approving drops their platform fee from {PLATFORM_FEE_LABEL} to ₹0.
        </p>
      </div>

      <Panel className="divide-y divide-line/70 p-0">
        {rows.map((row) => {
          if (!row.profile) return null
          const institute = isInstituteEmail(row.email)
          const decided = row.status !== 'pending'

          return (
            <div key={row.profile.id} className="flex flex-wrap items-start gap-3 p-4">
              <Avatar name={row.profile.full_name} src={row.profile.avatar_url} size="sm" />

              <div className="min-w-[220px] flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/profile/${row.profile.id}`}
                    className="text-[14px] font-medium text-chalk hover:text-cyan"
                  >
                    {row.profile.full_name ?? 'Unknown account'}
                  </Link>
                  <Badge tone={TONE[row.status]}>{FEE_WAIVER_LABEL[row.status]}</Badge>
                  <span className="text-[12px] text-dimmer">
                    {decided
                      ? `decided ${relativeTime(row.decided_at)}`
                      : `asked ${relativeTime(row.requested_at)}`}
                  </span>
                </div>

                <p className="text-[12.5px] text-dim">
                  {row.email ? <span className="hud">{row.email}</span> : '— no email on file'}
                  {row.email && (
                    <span className={institute ? 'ml-2 text-teal' : 'ml-2 text-rose'}>
                      {institute ? 'institute address ✓' : 'not an institute address'}
                    </span>
                  )}
                  {row.profile.department && (
                    <span className="ml-2 text-dim">
                      · {row.profile.department}
                      {row.profile.year ? `, year ${row.profile.year}` : ''}
                    </span>
                  )}
                </p>

                {row.request && (
                  <p className="rounded-lg border border-line bg-black/[0.02] px-3 py-2 text-[13px] leading-relaxed text-mist">
                    {row.request}
                  </p>
                )}

                {row.note && (
                  <p className="text-[13px] leading-relaxed text-mist">Your note: {row.note}</p>
                )}
              </div>

              <form action={act} className="w-full shrink-0 space-y-2 sm:w-[19rem]">
                <input type="hidden" name="profile_id" value={row.profile.id} />
                <Input
                  name="note"
                  maxLength={400}
                  defaultValue={row.note ?? ''}
                  placeholder={
                    institute
                      ? 'Note — required to reject'
                      : 'Not an institute address — say so here'
                  }
                  className="text-[13px]"
                />
                <div className="flex gap-2">
                  <SubmitButton
                    size="sm"
                    variant="secondary"
                    name="decision"
                    value="approved"
                    pendingLabel="…"
                  >
                    {row.status === 'approved' ? 'Re-approve' : 'Waive the fee'}
                  </SubmitButton>
                  <SubmitButton
                    size="sm"
                    variant="danger"
                    name="decision"
                    value="rejected"
                    pendingLabel="…"
                  >
                    Refuse
                  </SubmitButton>
                </div>
              </form>
            </div>
          )
        })}
      </Panel>

      <p className="text-[12.5px] leading-relaxed text-dim">
        A refused waiver is not a ban and not a suspension — they keep posting and applying exactly
        as before, at the standard {PLATFORM_FEE_LABEL}. Use the Accounts tab if you actually need
        to stop someone.
      </p>
    </div>
  )
}
