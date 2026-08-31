'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, QuestStatus } from '@/lib/types'
import {
  FieldError,
  optionalText,
  requireEnum,
  requireInt,
  requirePhone,
  requireText,
  runAction,
  text,
} from '@/lib/validate'

/*
 * Every mutation on a quest lives here. They all share the same shape so they
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

function questId(form: FormData): string {
  const id = text(form, 'questId')
  if (!id) throw new FieldError('Missing quest reference.')
  return id
}

function refresh(id: string) {
  revalidatePath(`/quests/${id}`)
  revalidatePath('/quests')
  revalidatePath('/dashboard')
}

// ── Student: apply ──────────────────────────────────────────────────────────

export async function applyToQuest(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = questId(form)

    if (session.profile!.role !== 'student') {
      throw new FieldError(
        'Only verified IIT BHU students can claim quests. Your account is set up to post work instead.',
      )
    }

    const coverNote = requireText(form, 'cover_note', {
      label: 'Your pitch',
      min: 10,
      max: 1500,
    })
    const phone = requirePhone(form, 'phone', 'Your phone number')

    const { data: application, error } = await supabase
      .from('applications')
      .insert({ quest_id: id, student_id: session.userId, cover_note: coverNote })
      .select('id')
      .single<{ id: string }>()

    if (error) {
      if (error.code === '23505' || /duplicate key/i.test(error.message)) {
        throw new FieldError('You have already applied to this quest.')
      }
      throw new Error(error.message)
    }

    // Phone goes into the side table, where RLS keeps it from the hirer until
    // they accept. A failure here is not fatal — the application still stands.
    const { error: contactError } = await supabase
      .from('application_contacts')
      .upsert({ application_id: application.id, phone })

    refresh(id)

    if (contactError) {
      return {
        ok: true,
        message:
          'Application sent — but your phone number could not be saved. Add it from your dashboard.',
      }
    }
    return {
      ok: true,
      message:
        'Application sent. Your number stays hidden until the hirer accepts you — then you both see each other.',
    }
  })
}

export async function withdrawApplication(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = questId(form)
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
    const id = questId(form)
    const applicationId = text(form, 'applicationId')
    if (!applicationId) throw new FieldError('Missing application reference.')

    // One transaction: accept this one, reject the rest, assign the quest.
    const { error } = await supabase.rpc('accept_application', { p_application: applicationId })
    if (error) throw new Error(error.message)

    refresh(id)
    return {
      ok: true,
      message: 'Applicant hired. Phone numbers are now visible to both of you.',
    }
  })
}

export async function rejectApplicant(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actor()
    const id = questId(form)
    const applicationId = text(form, 'applicationId')
    if (!applicationId) throw new FieldError('Missing application reference.')

    // The "quest owner decides" UPDATE policy is what actually authorises this.
    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)

    if (error) throw new Error(error.message)

    refresh(id)
    return { ok: true, message: 'Applicant declined.' }
  })
}

// ── Either side: move the quest along ───────────────────────────────────────

const STATUSES: QuestStatus[] = ['open', 'assigned', 'in_progress', 'completed', 'cancelled']

export async function updateQuestStatus(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await actor()
    const id = questId(form)
    const status = requireEnum(form, 'status', STATUSES, 'status')

    const { error } = await supabase.rpc('set_quest_status', { p_quest: id, p_status: status })
    if (error) throw new Error(error.message)

    refresh(id)

    const said: Record<QuestStatus, string> = {
      open: 'Quest reopened — it is back on the board.',
      assigned: 'Quest marked as assigned.',
      in_progress: 'Marked in progress. Good luck.',
      completed: 'Quest completed. You can leave a review now.',
      cancelled: 'Quest cancelled. It no longer appears on the board.',
    }
    return { ok: true, message: said[status] }
  })
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function submitReview(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { session, supabase } = await actor()
    const id = questId(form)
    const revieweeId = text(form, 'revieweeId')
    if (!revieweeId) throw new FieldError('Missing the person being reviewed.')
    if (revieweeId === session.userId) throw new FieldError('You cannot review yourself.')

    const rating = requireInt(form, 'rating', { label: 'Rating', min: 1, max: 5 })
    const comment = optionalText(form, 'comment', { label: 'Comment', max: 800 })

    const { error } = await supabase.from('reviews').insert({
      quest_id: id,
      reviewer_id: session.userId,
      reviewee_id: revieweeId,
      rating,
      comment,
    })

    if (error) {
      if (/duplicate key/i.test(error.message)) {
        throw new FieldError('You have already reviewed this quest.')
      }
      throw new Error(error.message)
    }

    refresh(id)
    revalidatePath(`/profile/${revieweeId}`)
    return { ok: true, message: 'Review posted. Thanks — reputation is what makes this work.' }
  })
}
