'use client'

import { useActionState } from 'react'
import { Field, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconCoins } from '@/components/ui/Icons'
import { FEE_WAIVER_LABEL, INSTITUTE_NAME, PLATFORM_FEE_LABEL } from '@/lib/constants'
import type { ActionResult, FeeWaiverStatus } from '@/lib/types'
import { requestFeeWaiver } from '../actions'

/**
 * The student fee waiver (item 2).
 *
 * The important thing this screen has to communicate: the waiver is about the
 * *fee*, not about permission. Anyone can post and anyone can apply — a verified
 * student just keeps the whole reward. The old build gated claiming work on an
 * institute email, and every line here is written to make sure nobody reads that
 * rule back into this one.
 */
export function WaiverForm({
  status,
  note,
  eligible,
}: {
  status: FeeWaiverStatus
  /** The admin's reply, once there is one. */
  note: string | null
  /** Whether this account could hold role='student' at all — see qualifiesForWaiver(). */
  eligible: boolean
}) {
  const [result, action] = useActionState<ActionResult | null, FormData>(requestFeeWaiver, null)

  const settled: Partial<Record<FeeWaiverStatus, { tone: 'success' | 'info'; body: string }>> = {
    approved: {
      tone: 'success',
      body: `Approved — you pay no platform fee. Every rupee a hirer sets as the reward reaches you.`,
    },
    pending: {
      tone: 'info',
      body: 'Waiting on an admin. Until it is decided the standard fee applies, and you can keep applying for gigs exactly as before.',
    },
  }

  const done = settled[status]

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-black/[0.03] text-lime">
          <IconCoins className="size-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h2 className="text-base font-semibold text-chalk">Student fee waiver</h2>
            <span className="hud text-[12.5px] text-dim">{FEE_WAIVER_LABEL[status]}</span>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-mist">
            GigNest takes {PLATFORM_FEE_LABEL} of a completed gig. {INSTITUTE_NAME} students can
            have that dropped to ₹0: an admin checks your institute address and your student ID
            against the name on your account, and that is it. It changes what you are paid,
            nothing else — applying for gigs is open to everyone either way.
          </p>
        </div>
      </div>

      {done ? (
        <Notice tone={done.tone} className="mt-4">
          {done.body}
          {note && <span className="mt-1.5 block opacity-90">Admin note: {note}</span>}
        </Notice>
      ) : (
        <>
          {status === 'rejected' && (
            <Notice tone="warn" title="Not approved last time" className="mt-4">
              {note ?? 'An admin could not match your account to a student ID.'} You can ask again
              with more detail below.
            </Notice>
          )}

          {!eligible && (
            <Notice tone="info" title="Sign in with your institute address" className="mt-4">
              This account is not on an {INSTITUTE_NAME} address, so the waiver cannot be granted
              to it. Signing in with your <span className="hud">@itbhu.ac.in</span> Google account
              is the fix — and note this only affects the fee, never your ability to post or
              apply.
            </Notice>
          )}

          <form action={action} className="mt-4 space-y-4">
            <Field
              label="Which course and year"
              htmlFor="note"
              required
              error={result && !result.ok ? result.message : undefined}
              hint="10–400 characters. Enough for an admin to find you on the rolls — department, course, year, roll number if you like."
            >
              <Textarea
                id="note"
                name="note"
                required
                minLength={10}
                maxLength={400}
                className="min-h-20"
                placeholder="B.Tech Computer Science, third year, roll 21085xxx. Happy to send a photo of my ID card if you need it."
              />
            </Field>

            {result?.ok && <Notice tone="success">{result.message}</Notice>}

            <SubmitButton pendingLabel="Sending…" size="sm" disabled={!eligible}>
              Ask for the waiver
            </SubmitButton>
          </form>
        </>
      )}
    </Panel>
  )
}
