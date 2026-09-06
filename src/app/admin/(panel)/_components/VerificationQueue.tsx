'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { AdminVerification } from '@/lib/admin-queries'
import { ID_KIND_LABEL, isInstituteEmail } from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import { maskId } from '@/lib/kyc'
import type { ActionResult } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { Badge, VerificationPill } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Field'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconIdCard } from '@/components/ui/Icons'
import { decideVerification } from '../../actions'

/**
 * The ID review queue (item 4).
 *
 * What an admin is actually deciding here: does the name printed on a government
 * ID plausibly belong to the account holder? They have the name, the ID type, the
 * last four digits and the signup email. They do not have the number, because it
 * was never stored — so this screen cannot leak one however wrong it goes.
 *
 * The honest limit of that: this proves a human checked a document, not that UIDAI
 * or the Income Tax Department confirmed it. The README says the same thing at
 * more length, and so does /verify, so nobody mistakes the badge for more than it
 * is.
 */
export function VerificationQueue({ rows }: { rows: AdminVerification[] }) {
  const [result, act] = useActionState<ActionResult | null, FormData>(decideVerification, null)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconIdCard className="size-5" />}
        title="Nothing waiting"
        blurb="Submissions land here from /verify and from the verification links people send each other. Approving one puts a Verified badge on their profile and on every gig they post."
      />
    )
  }

  const pending = rows.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-3">
      {result && <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13.5px] text-mist">
          {pending === 0
            ? 'No submissions waiting.'
            : `${pending} waiting on you. Published turnaround is same-day.`}
        </p>
        <p className="text-[12.5px] text-dim">
          Stored per submission: name, type, last four digits, salted hash. Never the number.
        </p>
      </div>

      <Panel className="divide-y divide-line/70 p-0">
        {rows.map((row) => {
          const decided = row.status !== 'pending'
          return (
            <div key={row.id} className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={row.profile?.full_name} src={row.profile?.avatar_url} size="sm" />

                <div className="min-w-[220px] flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/profile/${row.profile_id}`}
                      className="text-[14px] font-medium text-chalk hover:text-cyan"
                    >
                      {row.profile?.full_name ?? 'Unknown account'}
                    </Link>
                    <VerificationPill status={row.status} />
                    <span className="text-[12px] text-dimmer">
                      {decided
                        ? `decided ${relativeTime(row.decided_at)}`
                        : `sent ${relativeTime(row.created_at)}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Badge tone="neutral">{ID_KIND_LABEL[row.kind]}</Badge>
                    <span className="hud text-[13px] tracking-wider text-chalk">
                      {maskId(row.kind, row.last4)}
                    </span>
                    <span className="text-[13px] text-mist">
                      as <span className="font-medium text-chalk">{row.name_on_id}</span>
                    </span>
                  </div>

                  <p className="text-[12.5px] text-dim">
                    {row.email ? (
                      <>
                        <span className="hud">{row.email}</span>
                        {isInstituteEmail(row.email) && (
                          <span className="ml-2 text-teal">institute address</span>
                        )}
                      </>
                    ) : (
                      '— no email on file'
                    )}
                  </p>

                  {row.note && (
                    <p className="text-[13px] leading-relaxed text-mist">Note: {row.note}</p>
                  )}
                </div>

                {/* One form, two submit buttons: the decision rides on the button's
                    own name/value, so a single note field serves both. */}
                <form action={act} className="w-full shrink-0 space-y-2 sm:w-[19rem]">
                  <input type="hidden" name="verification_id" value={row.id} />
                  <input type="hidden" name="profile_id" value={row.profile_id} />
                  <Input
                    name="note"
                    maxLength={400}
                    defaultValue={row.note ?? ''}
                    placeholder={
                      decided
                        ? 'Change the note if you are reversing this'
                        : 'Note — required to reject, optional to approve'
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
                      {row.status === 'approved' ? 'Re-approve' : 'Approve'}
                    </SubmitButton>
                    <SubmitButton
                      size="sm"
                      variant="danger"
                      name="decision"
                      value="rejected"
                      pendingLabel="…"
                    >
                      Reject
                    </SubmitButton>
                  </div>
                </form>
              </div>
            </div>
          )
        })}
      </Panel>

      <p className="text-[12.5px] leading-relaxed text-dim">
        Approving stamps <span className="hud">profiles.id_verified_at</span>; rejecting clears it,
        so a badge never outlives the decision behind it. Re-submitting the same kind of ID replaces
        the row rather than adding one.
      </p>
    </div>
  )
}
