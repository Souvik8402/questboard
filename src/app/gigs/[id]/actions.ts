'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { DISPUTE_REASONS, DISPUTE_SLA_LABEL } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, GigStatus } from '@/lib/types'
import {
  FieldError,
  optionalText,
  requireEnum,
  requireInt,
  requireText,
  runAction,
  text,
} from '@/lib/validate'

/*
 * Every mutation on a gig lives here. They all share the same shape so they
 * can be driven by `useActionState`, and they all lean on RLS or a SECURITY
 * DEFINER RPC for the actual authority check — the code below is the friendly
 * face, not the lock.
 */

const DEMO_MESSAGE =
  'Demo mode — no database connected, so nothing can be saved. Add your Supabase keys to .env.local to make this live.'

/** Shared preamble: signed in, has a profile, database present. */
async function actor() {
  if (!isSupabaseConfigured) throw new FieldError(DEMO_MESSAGE)

  const session = await getSession()
  if (!session) throw new FieldError('Sign in first — your session may have expired.')
  if (!session.profile?.onboarded_at) {
    throw new FieldError('Finish setting up your profile before doing that.')
  }
  if (session.profile.is_banned) {
    throw new FieldError('Your account is suspended. Contact the admin.')
  }

  return { session, supabase: await createClient() }
}

function gigId(form: FormData): string {
  const id = text(form, 'gigId')
  if (!id) throw new FieldError('Missing gig reference.')
  return id
}

function refresh(id: string) {
  revalidatePath(`/gigs/${id}`)
  revalidatePath('/gigs')
  revalidatePath('/dashboard')
}

// ── Any signed-in user: apply ───────────────────────────────────────────────
/*
 * There is no role check here any more. Anyone with an account may apply — the
 * institute mailbox now only decides whether the platform fee is waived. The
 * INSERT policy in schema.sql asks the same single question: are you banned?
 */

export async function applyToGig(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = gigId(form)

    const coverNote = requireText(form, 'cover_note', {
      label: 'Your pitch',
      min: 10,
      max: 1500,
    })

    const { error } = await supabase
      .from('applications')
      .insert({ gig_id: id, student_id: session.userId, cover_note: coverNote })

    if (error) {
      if (error.code === '23505' || /duplicate key/i.test(error.message)) {
        throw new FieldError('You have already applied to this gig.')
      }
      throw new Error(error.message)
    }

    refresh(id)

    return {
      ok: true,
      message:
        'Application sent. If you are hired, a private thread opens here — no phone numbers, no email addresses, either way.',
    }
  })
}

export async function withdrawApplication(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = gigId(form)
    const applicationId = text(form, 'applicationId')
    if (!applicationId) throw new FieldError('Missing application reference.')

    const { error } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .eq('student_id', session.userId)

    if (error) throw new Error(error.message)

    refresh(id)
    return { ok: true, message: 'Application withdrawn.' }
  })
}

// ── Hirer: decide ───────────────────────────────────────────────────────────

export async function acceptApplicant(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actor()
    const id = gigId(form)
    const applicationId = text(form, 'applicationId')
    if (!applicationId) throw new FieldError('Missing application reference.')

    // One transaction: accept this one, reject the rest, assign the gig.
    const { error } = await supabase.rpc('accept_application', { p_application: applicationId })
    if (error) throw new Error(error.message)

    refresh(id)
    return {
      ok: true,
      message: 'Applicant hired. A private thread is now open in your inbox.',
    }
  })
}

export async function rejectApplicant(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actor()
    const id = gigId(form)
    const applicationId = text(form, 'applicationId')
    if (!applicationId) throw new FieldError('Missing application reference.')

    // The "gig owner decides" UPDATE policy is what actually authorises this.
    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)

    if (error) throw new Error(error.message)

    refresh(id)
    return { ok: true, message: 'Applicant declined.' }
  })
}

// ── Either side: move the gig along ───────────────────────────────────────

const STATUSES: GigStatus[] = ['open', 'assigned', 'in_progress', 'completed', 'cancelled']

export async function updateGigStatus(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actor()
    const id = gigId(form)
    const status = requireEnum(form, 'status', STATUSES, 'status')

    const { error } = await supabase.rpc('set_gig_status', { p_gig: id, p_status: status })
    if (error) throw new Error(error.message)

    refresh(id)

    const said: Record<GigStatus, string> = {
      open: 'Gig reopened — it is back on the board.',
      assigned: 'Gig marked as assigned.',
      in_progress: 'Marked in progress. Good luck.',
      completed: 'Gig completed. You can leave a review now.',
      cancelled: 'Gig cancelled. It no longer appears on the board.',
    }
    return { ok: true, message: said[status] }
  })
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function submitReview(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = gigId(form)
    const revieweeId = text(form, 'revieweeId')
    if (!revieweeId) throw new FieldError('Missing the person being reviewed.')
    if (revieweeId === session.userId) throw new FieldError('You cannot review yourself.')

    const rating = requireInt(form, 'rating', { label: 'Rating', min: 1, max: 5 })
    const comment = optionalText(form, 'comment', { label: 'Comment', max: 800 })

    const { error } = await supabase.from('reviews').insert({
      gig_id: id,
      reviewer_id: session.userId,
      reviewee_id: revieweeId,
      rating,
      comment,
    })

    if (error) {
      if (/duplicate key/i.test(error.message)) {
        throw new FieldError('You have already reviewed this gig.')
      }
      throw new Error(error.message)
    }

    refresh(id)
    revalidatePath(`/profile/${revieweeId}`)
    return { ok: true, message: 'Review posted. Thanks — reputation is what makes this work.' }
  })
}

// ── The thread (item 5) ─────────────────────────────────────────────────────
/*
 * The only channel between a hirer and the person they hired. Authority is the
 * `messages` INSERT policy: in_gig_thread() plus gig_is_assigned(), so a hirer
 * cannot message hopeful applicants and a stranger cannot message either side.
 */

export async function sendMessage(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = gigId(form)
    const body = requireText(form, 'body', { label: 'Message', min: 1, max: 2000 })

    const { error } = await supabase
      .from('messages')
      .insert({ gig_id: id, sender_id: session.userId, body })

    if (error) {
      // RLS refusing is the expected failure, not a bug — say what it means.
      if (error.code === '42501') {
        throw new FieldError('This thread is not open. It opens once someone is hired for the gig.')
      }
      throw new Error(error.message)
    }

    revalidatePath(`/inbox/${id}`)
    revalidatePath('/inbox')
    return { ok: true, message: 'Sent.' }
  })
}

// ── Disputes (item 8) ───────────────────────────────────────────────────────

const REASON_VALUES = DISPUTE_REASONS.map((r) => r.value)

export async function raiseDispute(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = gigId(form)
    const reason = requireEnum(form, 'reason', REASON_VALUES, 'reason')
    const detail = requireText(form, 'detail', {
      label: 'What happened',
      min: 20,
      max: 1500,
    })

    const { error } = await supabase
      .from('disputes')
      .insert({ gig_id: id, raised_by: session.userId, reason, detail })

    if (error) {
      if (error.code === '23505' || /duplicate key/i.test(error.message)) {
        throw new FieldError(
          'You already have an open case on this gig. Reply in the thread and an admin will pick it up.',
        )
      }
      if (error.code === '42501') {
        throw new FieldError('Only the two people on a gig can raise a dispute about it.')
      }
      throw new Error(error.message)
    }

    refresh(id)
    return {
      ok: true,
      message: `Dispute filed. An admin reads both sides and the thread — average resolution is ${DISPUTE_SLA_LABEL}.`,
    }
  })
}
