'use client'

import { useActionState } from 'react'
import type { ActionResult, PublicProfile } from '@/lib/types'
import { Field, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { StarPicker } from '@/components/StarRating'
import { UserChip } from '@/components/Avatar'
import { submitReview } from '../actions'

/**
 * Post-completion review. The RLS INSERT policy only permits this on a
 * completed gig, between its two participants, once each — so the worst a
 * tampered form can do is get rejected.
 */
export function ReviewForm({
  gigId,
  reviewee,
  role,
}: {
  gigId: string
  reviewee: PublicProfile
  /** Which side the reviewee is on, so the prompt reads naturally. */
  role: 'student' | 'hirer'
}) {
  const [result, action] = useActionState<ActionResult | null, FormData>(submitReview, null)

  if (result?.ok) {
    return <Notice tone="success">{result.message}</Notice>
  }

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold text-chalk">
        Rate {reviewee.full_name?.split(' ')[0] ?? 'your counterparty'}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-mist">
        {role === 'student'
          ? 'Did they do the work well, on time, without chasing?'
          : 'Was the brief clear, the reward paid, the person straightforward to deal with?'}{' '}
        Reviews are public and permanent.
      </p>

      <div className="mt-4">
        <UserChip profile={reviewee} size="md" />
      </div>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="gigId" value={gigId} />
        <input type="hidden" name="revieweeId" value={reviewee.id} />

        <Field label="Rating" required>
          <StarPicker />
        </Field>

        <Field label="Comment" hint="Optional, up to 800 characters.">
          <Textarea
            name="comment"
            maxLength={800}
            placeholder="Turned up on time, sent daily updates, handed over clean files."
            className="min-h-20"
          />
        </Field>

        {result && !result.ok && <Notice tone="error">{result.message}</Notice>}

        <SubmitButton pendingLabel="Posting…" size="sm">
          Post review
        </SubmitButton>
      </form>
    </Panel>
  )
}
