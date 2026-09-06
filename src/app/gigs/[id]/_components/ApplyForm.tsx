'use client'

import { useActionState } from 'react'
import { Field, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconBolt, IconLock } from '@/components/ui/Icons'
import type { ActionResult } from '@/lib/types'
import { applyToGig } from '../actions'

/**
 * The apply form. Rendered for any signed-in account on an open gig — there is
 * no student check any more.
 *
 * It asks for a pitch and nothing else. The phone field that used to sit here is
 * gone: no contact detail is collected from either side, ever, because the two
 * of you talk in the gig thread once someone is hired.
 */
export function ApplyForm({
  gigId,
  reward,
  isUrgent = false,
}: {
  gigId: string
  reward: string
  isUrgent?: boolean
}) {
  const [result, action] = useActionState<ActionResult | null, FormData>(applyToGig, null)

  if (result?.ok) {
    return (
      <Notice tone="success" title="You are in the running">
        {result.message}
      </Notice>
    )
  }

  const fieldError = (name: string) =>
    result && !result.ok && result.field === name ? result.message : undefined
  const generalError = result && !result.ok && !result.field ? result.message : undefined

  return (
    <Panel className="p-5" glow>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-chalk">Apply for this gig</h2>
        <span className="hud text-sm text-lime">{reward}</span>
      </div>
      <p className="mt-1 text-[14px] leading-relaxed text-mist">
        Tell the hirer why you. Specifics beat enthusiasm — name the thing you have done that is
        closest to this.
      </p>

      {isUrgent && (
        <p className="mt-3 inline-flex items-start gap-1.5 rounded-lg border border-rose/25 bg-rose/[0.06] px-3 py-2 text-[13px] leading-relaxed text-rose">
          <IconBolt className="mt-0.5 size-3.5 shrink-0" />
          <span>
            This one is first-come-first-served. The hirer reviews applicants in the order they
            arrived, so applying sooner puts you higher in the queue.
          </span>
        </p>
      )}

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="gigId" value={gigId} />

        <Field
          label="Your pitch"
          htmlFor="cover_note"
          required
          error={fieldError('cover_note')}
          hint="10–1500 characters. The hirer sees this, your badges and your profile — nothing else."
        >
          <Textarea
            id="cover_note"
            name="cover_note"
            required
            minLength={10}
            maxLength={1500}
            placeholder="I rebuilt the Technex registration page last year — same stack, ~200 signups a day. I can start Saturday and turn it around in a week."
          />
        </Field>

        {generalError && <Notice tone="error">{generalError}</Notice>}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Sending…">Send application</SubmitButton>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-dim">
            <IconLock className="size-3" />
            No phone number, no email — a private thread opens if you are hired
          </span>
        </div>
      </form>
    </Panel>
  )
}
