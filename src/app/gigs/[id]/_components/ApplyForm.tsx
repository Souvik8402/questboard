'use client'

import { useActionState } from 'react'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconLock, IconPhone } from '@/components/ui/Icons'
import type { ActionResult } from '@/lib/types'
import { applyToGig } from '../actions'

/**
 * The claim form. Only rendered for signed-in students on an open gig —
 * every other case gets a static explainer from the page instead.
 */
export function ApplyForm({
  gigId,
  reward,
  defaultPhone,
}: {
  gigId: string
  reward: string
  defaultPhone?: string | null
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
        <h2 className="text-base font-semibold text-chalk">Claim this gig</h2>
        <span className="hud text-sm text-lime">{reward}</span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-mist">
        Tell the hirer why you. Specifics beat enthusiasm — name the thing you have done that is
        closest to this.
      </p>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="gigId" value={gigId} />

        <Field
          label="Your pitch"
          htmlFor="cover_note"
          required
          error={fieldError('cover_note')}
          hint="10–1500 characters. The hirer sees this and your profile, nothing else yet."
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

        <Field
          label="Your phone number"
          htmlFor="phone"
          required
          error={fieldError('phone')}
          hint="Stored in a separate table the hirer cannot read until they accept you."
        >
          <div className="relative">
            <IconPhone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              defaultValue={defaultPhone ?? ''}
              placeholder="+91 98765 43210"
              className="pl-10"
              autoComplete="tel"
            />
          </div>
        </Field>

        {generalError && <Notice tone="error">{generalError}</Notice>}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Sending…">Send application</SubmitButton>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-dim">
            <IconLock className="size-3" />
            Contact details stay hidden both ways until accepted
          </span>
        </div>
      </form>
    </Panel>
  )
}
